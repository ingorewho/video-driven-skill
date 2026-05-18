package io.videodrivenskill.service;

import io.videodrivenskill.exception.FFmpegNotAvailableException;
import io.videodrivenskill.model.FrameInfo;
import io.videodrivenskill.model.VideoArchive;
import io.videodrivenskill.model.VideoUploadResponse;
import io.videodrivenskill.repository.VideoArchiveRepository;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoService {

  @Value("${app.upload-dir}")
  private String uploadDir;

  @Value("${app.ffmpeg-path}")
  private String ffmpegPath;

  private final VideoArchiveRepository videoArchiveRepository;

  public VideoUploadResponse uploadVideo(MultipartFile file) throws IOException {
    Path uploadPath = Paths.get(uploadDir);
    Files.createDirectories(uploadPath);

    String videoId = UUID.randomUUID().toString();
    String originalFilename = file.getOriginalFilename();
    String ext =
        originalFilename != null && originalFilename.contains(".")
            ? originalFilename.substring(originalFilename.lastIndexOf("."))
            : ".mp4";
    String filename = videoId + ext;

    Path videoPath = uploadPath.resolve(filename);
    file.transferTo(videoPath);

    long duration = 0;
    try {
      duration = getVideoDuration(videoPath.toString());
    } catch (FFmpegNotAvailableException e) {
      log.warn(
          "FFmpeg/ffprobe not available during upload, duration will be 0: {}", e.getMessage());
    }

    return VideoUploadResponse.builder()
        .videoId(videoId)
        .filename(filename)
        .duration(duration)
        .fileSize(file.getSize())
        .build();
  }

  public List<FrameInfo> extractFramesAuto(String videoId, int intervalSeconds)
      throws IOException, InterruptedException {
    Path videoPath = findVideoPath(videoId);
    if (videoPath == null) throw new FileNotFoundException("Video not found: " + videoId);

    long duration = getVideoDuration(videoPath.toString());
    List<Double> timestamps = new ArrayList<>();
    for (double t = 0; t < duration; t += intervalSeconds) {
      timestamps.add(t);
    }

    return extractFramesAtTimestamps(videoId, videoPath, timestamps);
  }

  public List<FrameInfo> extractFramesManual(String videoId, List<Double> timestamps)
      throws IOException, InterruptedException {
    Path videoPath = findVideoPath(videoId);
    if (videoPath == null) throw new FileNotFoundException("Video not found: " + videoId);

    return extractFramesAtTimestamps(videoId, videoPath, timestamps);
  }

  private List<FrameInfo> extractFramesAtTimestamps(
      String videoId, Path videoPath, List<Double> timestamps)
      throws IOException, InterruptedException {
    Path framesDir = Paths.get(uploadDir, videoId + "_frames");
    Files.createDirectories(framesDir);

    List<FrameInfo> frames = new ArrayList<>();

    for (double timestamp : timestamps) {
      String frameId = UUID.randomUUID().toString();
      String frameFilename = frameId + ".jpg";
      Path framePath = framesDir.resolve(frameFilename);

      extractSingleFrame(videoPath.toString(), timestamp, framePath.toString());

      if (Files.exists(framePath)) {
        byte[] imageBytes = Files.readAllBytes(framePath);
        String base64 = Base64.getEncoder().encodeToString(imageBytes);

        frames.add(
            FrameInfo.builder()
                .frameId(frameId)
                .timestamp(timestamp)
                .base64Image(base64)
                .description("")
                .build());
      }
    }

    return frames;
  }

  private void extractSingleFrame(String videoPath, double timestamp, String outputPath)
      throws IOException, InterruptedException {
    List<String> cmd =
        List.of(
            ffmpegPath,
            "-ss",
            String.format("%.2f", timestamp),
            "-i",
            videoPath,
            "-vframes",
            "1",
            "-q:v",
            "2",
            "-y",
            outputPath);

    Process process;
    try {
      ProcessBuilder pb = new ProcessBuilder(cmd);
      pb.redirectErrorStream(true);
      process = pb.start();
    } catch (IOException e) {
      FFmpegNotAvailableException.throwIfFFmpegNotFound(e);
      throw e;
    }

    // consume output
    process.getInputStream().transferTo(OutputStream.nullOutputStream());

    boolean finished = process.waitFor(30, TimeUnit.SECONDS);
    if (!finished) {
      process.destroyForcibly();
      throw new IOException("FFmpeg timeout for timestamp: " + timestamp);
    }

    if (process.exitValue() != 0) {
      throw new IOException(
          "FFmpeg exited with code " + process.exitValue() + " for timestamp: " + timestamp);
    }
  }

  public long getVideoDuration(String videoPath) {
    try {
      List<String> cmd =
          List.of(
              "ffprobe",
              "-v",
              "quiet",
              "-show_entries",
              "format=duration",
              "-of",
              "csv=p=0",
              videoPath);

      ProcessBuilder pb = new ProcessBuilder(cmd);
      pb.redirectErrorStream(false);
      Process process = pb.start();

      String output = new String(process.getInputStream().readAllBytes()).trim();
      process.waitFor(10, TimeUnit.SECONDS);

      return (long) Double.parseDouble(output);
    } catch (Exception e) {
      if (e instanceof IOException io) {
        FFmpegNotAvailableException.throwIfFFmpegNotFound(io);
      }
      log.warn("Failed to get video duration: {}", e.getMessage());
      return 0;
    }
  }

  private Path findVideoPath(String videoId) throws IOException {
    // 1. 先在 uploads 目录查找（原始上传的视频）
    Path uploadPath = Paths.get(uploadDir);
    if (Files.exists(uploadPath)) {
      Path found =
          Files.list(uploadPath)
              .filter(p -> p.getFileName().toString().startsWith(videoId))
              .filter(p -> !p.toString().contains("_frames"))
              .findFirst()
              .orElse(null);
      if (found != null) return found;
    }

    // 2. 如果找不到，尝试查找归档视频（videoId 可能是 archiveId）
    Optional<VideoArchive> archiveOpt = videoArchiveRepository.findById(videoId);
    if (archiveOpt.isPresent()) {
      VideoArchive archive = archiveOpt.get();
      if (archive.getFilePath() != null) {
        Path archiveVideoPath = Paths.get(archive.getFilePath());
        if (Files.exists(archiveVideoPath)) {
          return archiveVideoPath;
        }
      }
    }

    // 3. 尝试通过原始 videoId 查找归档视频
    Optional<VideoArchive> archiveByOrigId = videoArchiveRepository.findByVideoId(videoId);
    if (archiveByOrigId.isPresent()) {
      VideoArchive archive = archiveByOrigId.get();
      if (archive.getFilePath() != null) {
        Path archiveVideoPath = Paths.get(archive.getFilePath());
        if (Files.exists(archiveVideoPath)) {
          return archiveVideoPath;
        }
      }
    }

    return null;
  }

  public Path getVideoPath(String videoId) throws IOException {
    return findVideoPath(videoId);
  }
}
