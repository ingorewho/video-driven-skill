package io.videodrivenskill.controller;

import io.videodrivenskill.model.ApiError;
import io.videodrivenskill.model.FrameExtractRequest;
import io.videodrivenskill.model.FrameInfo;
import io.videodrivenskill.service.VideoService;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoController {

  private final VideoService videoService;

  @PostMapping("/upload")
  public ResponseEntity<?> uploadVideo(@RequestParam("file") MultipartFile file) {
    try {
      return ResponseEntity.ok(videoService.uploadVideo(file));
    } catch (IOException e) {
      log.error("Failed to upload video", e);
      return ResponseEntity.internalServerError()
          .body(ApiError.builder().message("上传失败: " + e.getMessage()).build());
    }
  }

  @PostMapping("/{videoId}/frames/auto")
  public ResponseEntity<?> extractFramesAuto(
      @PathVariable String videoId, @RequestBody(required = false) FrameExtractRequest request) {
    try {
      int interval = request != null ? request.getIntervalSeconds() : 3;
      List<FrameInfo> frames = videoService.extractFramesAuto(videoId, interval);
      return ResponseEntity.ok(frames);
    } catch (IOException | InterruptedException e) {
      log.error("Failed to extract frames for video: {}", videoId, e);
      return ResponseEntity.internalServerError()
          .body(ApiError.builder().message("抽帧失败: " + e.getMessage()).build());
    }
  }

  @PostMapping("/{videoId}/frames/manual")
  public ResponseEntity<?> extractFramesManual(
      @PathVariable String videoId, @RequestBody FrameExtractRequest request) {
    try {
      List<FrameInfo> frames = videoService.extractFramesManual(videoId, request.getTimestamps());
      return ResponseEntity.ok(frames);
    } catch (IOException | InterruptedException e) {
      log.error("Failed to extract manual frames for video: {}", videoId, e);
      return ResponseEntity.internalServerError()
          .body(ApiError.builder().message("抽帧失败: " + e.getMessage()).build());
    }
  }

  @GetMapping("/{videoId}/stream")
  public ResponseEntity<Resource> streamVideo(@PathVariable String videoId) {
    try {
      Path videoPath = videoService.getVideoPath(videoId);
      if (videoPath == null) {
        return ResponseEntity.notFound().build();
      }
      Resource resource = new FileSystemResource(videoPath);
      return ResponseEntity.ok()
          .header(HttpHeaders.CONTENT_TYPE, "video/mp4")
          .header(HttpHeaders.ACCEPT_RANGES, "bytes")
          .body(resource);
    } catch (Exception e) {
      log.error("Failed to stream video: {}", videoId, e);
      return ResponseEntity.internalServerError().build();
    }
  }
}
