package io.videodrivenskill.controller.advice;

import io.videodrivenskill.exception.FFmpegNotAvailableException;
import io.videodrivenskill.model.ApiError;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(FFmpegNotAvailableException.class)
  public ResponseEntity<ApiError> handleFFmpegNotAvailable(FFmpegNotAvailableException e) {
    log.warn("FFmpeg not available: {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(e.toApiError());
  }
}
