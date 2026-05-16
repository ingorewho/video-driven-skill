package io.videodrivenskill.exception;

import io.videodrivenskill.model.ApiError;

import java.io.IOException;

public class FFmpegNotAvailableException extends RuntimeException {

  public static final String CODE = "FFMPEG_NOT_FOUND";

  public static final String USER_MESSAGE =
      "未检测到 FFmpeg，无法截取视频帧。请先安装 FFmpeg 并加入系统 PATH，"
          + "或在环境变量 FFMPEG_PATH / 配置 app.ffmpeg-path 中指定可执行文件路径。";

  public FFmpegNotAvailableException() {
    super(USER_MESSAGE);
  }

  public FFmpegNotAvailableException(Throwable cause) {
    super(USER_MESSAGE, cause);
  }

  public static void throwIfFFmpegNotFound(IOException cause) {
    String msg = cause.getMessage();
    if (msg == null) {
      return;
    }

    String lower = msg.toLowerCase();
    boolean isFFmpegNotFound = lower.contains("cannot run program")
            || lower.contains("no such file or directory")
            || lower.contains("createprocess error=2")
            || lower.contains("系统找不到指定的文件");

    if (isFFmpegNotFound) {
      throw new FFmpegNotAvailableException(cause);
    }
  }

  public ApiError toApiError() {
    return ApiError.builder()
        .code(CODE)
        .message(getMessage())
        .build();
  }
}
