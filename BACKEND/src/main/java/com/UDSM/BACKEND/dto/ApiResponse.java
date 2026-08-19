package com.UDSM.BACKEND.dto;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Generated;

@JsonInclude(Include.NON_NULL)
public class ApiResponse {
    private String status;
    private String message;
    private Object data;
    private Integer statusCode;
    private LocalDateTime timestamp;
    private ErrorDetails error;
    private Map<String, Object> metadata;

    public static ApiResponse success(String message) {
        return builder().status("SUCCESS").message(message).statusCode(200).timestamp(LocalDateTime.now()).build();
    }

    public static ApiResponse success(String message, Object data) {
        return builder().status("SUCCESS").message(message).data(data).statusCode(200).timestamp(LocalDateTime.now()).build();
    }

    public static ApiResponse success(String message, Object data, Map<String, Object> metadata) {
        return builder().status("SUCCESS").message(message).data(data).metadata(metadata).statusCode(200).timestamp(LocalDateTime.now()).build();
    }

    public static ApiResponse created(String message, Object data) {
        return builder().status("SUCCESS").message(message).data(data).statusCode(201).timestamp(LocalDateTime.now()).build();
    }

    public static ApiResponse error(String message) {
        return builder().status("ERROR").message(message).statusCode(400).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("BAD_REQUEST").message(message).build()).build();
    }

    public static ApiResponse error(String message, Integer statusCode) {
        return builder().status("ERROR").message(message).statusCode(statusCode).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code(getErrorCodeFromStatus(statusCode)).message(message).build()).build();
    }

    public static ApiResponse error(String message, Integer statusCode, String errorCode, Object details) {
        return builder().status("ERROR").message(message).statusCode(statusCode).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code(errorCode).message(message).details(details).build()).build();
    }

    public static ApiResponse warning(String message) {
        return builder().status("WARNING").message(message).statusCode(200).timestamp(LocalDateTime.now()).build();
    }

    public static ApiResponse validationError(String message, Map<String, String> fieldErrors) {
        return builder().status("ERROR").message("Validation failed").statusCode(400).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("VALIDATION_ERROR").message(message).fieldErrors(fieldErrors).build()).build();
    }

    public static ApiResponse unauthorized(String message) {
        return builder().status("ERROR").message(message).statusCode(401).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("UNAUTHORIZED").message("Authentication required").build()).build();
    }

    public static ApiResponse forbidden(String message) {
        return builder().status("ERROR").message(message).statusCode(403).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("FORBIDDEN").message("Access denied").build()).build();
    }

    public static ApiResponse notFound(String message) {
        return builder().status("ERROR").message(message).statusCode(404).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("NOT_FOUND").message(message).build()).build();
    }

    public static ApiResponse conflict(String message) {
        return builder().status("ERROR").message(message).statusCode(409).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("CONFLICT").message(message).build()).build();
    }

    public static ApiResponse internalError(String message) {
        return builder().status("ERROR").message(message).statusCode(500).timestamp(LocalDateTime.now()).error(ApiResponse.ErrorDetails.builder().code("INTERNAL_ERROR").message("An internal error occurred").build()).build();
    }

    private static String getErrorCodeFromStatus(Integer statusCode) {
        String var10000;
        switch (statusCode) {
            case 400 -> var10000 = "BAD_REQUEST";
            case 401 -> var10000 = "UNAUTHORIZED";
            case 403 -> var10000 = "FORBIDDEN";
            case 404 -> var10000 = "NOT_FOUND";
            case 409 -> var10000 = "CONFLICT";
            case 500 -> var10000 = "INTERNAL_ERROR";
            default -> var10000 = "ERROR";
        }

        return var10000;
    }

    public boolean isSuccess() {
        return "SUCCESS".equals(this.status) || this.statusCode != null && this.statusCode >= 200 && this.statusCode < 300;
    }

    @Generated
    public static ApiResponseBuilder builder() {
        return new ApiResponseBuilder();
    }

    @Generated
    public String getStatus() {
        return this.status;
    }

    @Generated
    public String getMessage() {
        return this.message;
    }

    @Generated
    public Object getData() {
        return this.data;
    }

    @Generated
    public Integer getStatusCode() {
        return this.statusCode;
    }

    @Generated
    public LocalDateTime getTimestamp() {
        return this.timestamp;
    }

    @Generated
    public ErrorDetails getError() {
        return this.error;
    }

    @Generated
    public Map<String, Object> getMetadata() {
        return this.metadata;
    }

    @Generated
    public void setStatus(final String status) {
        this.status = status;
    }

    @Generated
    public void setMessage(final String message) {
        this.message = message;
    }

    @Generated
    public void setData(final Object data) {
        this.data = data;
    }

    @Generated
    public void setStatusCode(final Integer statusCode) {
        this.statusCode = statusCode;
    }

    @Generated
    public void setTimestamp(final LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    @Generated
    public void setError(final ErrorDetails error) {
        this.error = error;
    }

    @Generated
    public void setMetadata(final Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof ApiResponse)) {
            return false;
        } else {
            ApiResponse other = (ApiResponse)o;
            if (!other.canEqual(this)) {
                return false;
            } else {
                Object this$statusCode = this.getStatusCode();
                Object other$statusCode = other.getStatusCode();
                if (this$statusCode == null) {
                    if (other$statusCode != null) {
                        return false;
                    }
                } else if (!this$statusCode.equals(other$statusCode)) {
                    return false;
                }

                Object this$status = this.getStatus();
                Object other$status = other.getStatus();
                if (this$status == null) {
                    if (other$status != null) {
                        return false;
                    }
                } else if (!this$status.equals(other$status)) {
                    return false;
                }

                Object this$message = this.getMessage();
                Object other$message = other.getMessage();
                if (this$message == null) {
                    if (other$message != null) {
                        return false;
                    }
                } else if (!this$message.equals(other$message)) {
                    return false;
                }

                Object this$data = this.getData();
                Object other$data = other.getData();
                if (this$data == null) {
                    if (other$data != null) {
                        return false;
                    }
                } else if (!this$data.equals(other$data)) {
                    return false;
                }

                Object this$timestamp = this.getTimestamp();
                Object other$timestamp = other.getTimestamp();
                if (this$timestamp == null) {
                    if (other$timestamp != null) {
                        return false;
                    }
                } else if (!this$timestamp.equals(other$timestamp)) {
                    return false;
                }

                Object this$error = this.getError();
                Object other$error = other.getError();
                if (this$error == null) {
                    if (other$error != null) {
                        return false;
                    }
                } else if (!this$error.equals(other$error)) {
                    return false;
                }

                Object this$metadata = this.getMetadata();
                Object other$metadata = other.getMetadata();
                if (this$metadata == null) {
                    if (other$metadata != null) {
                        return false;
                    }
                } else if (!this$metadata.equals(other$metadata)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof ApiResponse;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $statusCode = this.getStatusCode();
        result = result * 59 + ($statusCode == null ? 43 : $statusCode.hashCode());
        Object $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        Object $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        Object $data = this.getData();
        result = result * 59 + ($data == null ? 43 : $data.hashCode());
        Object $timestamp = this.getTimestamp();
        result = result * 59 + ($timestamp == null ? 43 : $timestamp.hashCode());
        Object $error = this.getError();
        result = result * 59 + ($error == null ? 43 : $error.hashCode());
        Object $metadata = this.getMetadata();
        result = result * 59 + ($metadata == null ? 43 : $metadata.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getStatus();
        return "ApiResponse(status=" + var10000 + ", message=" + this.getMessage() + ", data=" + String.valueOf(this.getData()) + ", statusCode=" + String.valueOf(this.getStatusCode()) + ", timestamp=" + String.valueOf(this.getTimestamp()) + ", error=" + String.valueOf(this.getError()) + ", metadata=" + String.valueOf(this.getMetadata()) + ")";
    }

    @Generated
    public ApiResponse() {
    }

    @Generated
    public ApiResponse(final String status, final String message, final Object data, final Integer statusCode, final LocalDateTime timestamp, final ErrorDetails error, final Map<String, Object> metadata) {
        this.status = status;
        this.message = message;
        this.data = data;
        this.statusCode = statusCode;
        this.timestamp = timestamp;
        this.error = error;
        this.metadata = metadata;
    }

    @Generated
    public static class ApiResponseBuilder {
        @Generated
        private String status;
        @Generated
        private String message;
        @Generated
        private Object data;
        @Generated
        private Integer statusCode;
        @Generated
        private LocalDateTime timestamp;
        @Generated
        private ErrorDetails error;
        @Generated
        private Map<String, Object> metadata;

        @Generated
        ApiResponseBuilder() {
        }

        @Generated
        public ApiResponseBuilder status(final String status) {
            this.status = status;
            return this;
        }

        @Generated
        public ApiResponseBuilder message(final String message) {
            this.message = message;
            return this;
        }

        @Generated
        public ApiResponseBuilder data(final Object data) {
            this.data = data;
            return this;
        }

        @Generated
        public ApiResponseBuilder statusCode(final Integer statusCode) {
            this.statusCode = statusCode;
            return this;
        }

        @Generated
        public ApiResponseBuilder timestamp(final LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        @Generated
        public ApiResponseBuilder error(final ErrorDetails error) {
            this.error = error;
            return this;
        }

        @Generated
        public ApiResponseBuilder metadata(final Map<String, Object> metadata) {
            this.metadata = metadata;
            return this;
        }

        @Generated
        public ApiResponse build() {
            return new ApiResponse(this.status, this.message, this.data, this.statusCode, this.timestamp, this.error, this.metadata);
        }

        @Generated
        public String toString() {
            String var10000 = this.status;
            return "ApiResponse.ApiResponseBuilder(status=" + var10000 + ", message=" + this.message + ", data=" + String.valueOf(this.data) + ", statusCode=" + String.valueOf(this.statusCode) + ", timestamp=" + String.valueOf(this.timestamp) + ", error=" + String.valueOf(this.error) + ", metadata=" + String.valueOf(this.metadata) + ")";
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class ErrorDetails {
        private String code;
        private String message;
        private Object details;
        private Map<String, String> fieldErrors;
        private String stackTrace;

        @Generated
        public static ErrorDetailsBuilder builder() {
            return new ErrorDetailsBuilder();
        }

        @Generated
        public String getCode() {
            return this.code;
        }

        @Generated
        public String getMessage() {
            return this.message;
        }

        @Generated
        public Object getDetails() {
            return this.details;
        }

        @Generated
        public Map<String, String> getFieldErrors() {
            return this.fieldErrors;
        }

        @Generated
        public String getStackTrace() {
            return this.stackTrace;
        }

        @Generated
        public void setCode(final String code) {
            this.code = code;
        }

        @Generated
        public void setMessage(final String message) {
            this.message = message;
        }

        @Generated
        public void setDetails(final Object details) {
            this.details = details;
        }

        @Generated
        public void setFieldErrors(final Map<String, String> fieldErrors) {
            this.fieldErrors = fieldErrors;
        }

        @Generated
        public void setStackTrace(final String stackTrace) {
            this.stackTrace = stackTrace;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof ErrorDetails)) {
                return false;
            } else {
                ErrorDetails other = (ErrorDetails)o;
                if (!other.canEqual(this)) {
                    return false;
                } else {
                    Object this$code = this.getCode();
                    Object other$code = other.getCode();
                    if (this$code == null) {
                        if (other$code != null) {
                            return false;
                        }
                    } else if (!this$code.equals(other$code)) {
                        return false;
                    }

                    Object this$message = this.getMessage();
                    Object other$message = other.getMessage();
                    if (this$message == null) {
                        if (other$message != null) {
                            return false;
                        }
                    } else if (!this$message.equals(other$message)) {
                        return false;
                    }

                    Object this$details = this.getDetails();
                    Object other$details = other.getDetails();
                    if (this$details == null) {
                        if (other$details != null) {
                            return false;
                        }
                    } else if (!this$details.equals(other$details)) {
                        return false;
                    }

                    Object this$fieldErrors = this.getFieldErrors();
                    Object other$fieldErrors = other.getFieldErrors();
                    if (this$fieldErrors == null) {
                        if (other$fieldErrors != null) {
                            return false;
                        }
                    } else if (!this$fieldErrors.equals(other$fieldErrors)) {
                        return false;
                    }

                    Object this$stackTrace = this.getStackTrace();
                    Object other$stackTrace = other.getStackTrace();
                    if (this$stackTrace == null) {
                        if (other$stackTrace != null) {
                            return false;
                        }
                    } else if (!this$stackTrace.equals(other$stackTrace)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof ErrorDetails;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            Object $code = this.getCode();
            result = result * 59 + ($code == null ? 43 : $code.hashCode());
            Object $message = this.getMessage();
            result = result * 59 + ($message == null ? 43 : $message.hashCode());
            Object $details = this.getDetails();
            result = result * 59 + ($details == null ? 43 : $details.hashCode());
            Object $fieldErrors = this.getFieldErrors();
            result = result * 59 + ($fieldErrors == null ? 43 : $fieldErrors.hashCode());
            Object $stackTrace = this.getStackTrace();
            result = result * 59 + ($stackTrace == null ? 43 : $stackTrace.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getCode();
            return "ApiResponse.ErrorDetails(code=" + var10000 + ", message=" + this.getMessage() + ", details=" + String.valueOf(this.getDetails()) + ", fieldErrors=" + String.valueOf(this.getFieldErrors()) + ", stackTrace=" + this.getStackTrace() + ")";
        }

        @Generated
        public ErrorDetails() {
        }

        @Generated
        public ErrorDetails(final String code, final String message, final Object details, final Map<String, String> fieldErrors, final String stackTrace) {
            this.code = code;
            this.message = message;
            this.details = details;
            this.fieldErrors = fieldErrors;
            this.stackTrace = stackTrace;
        }

        @Generated
        public static class ErrorDetailsBuilder {
            @Generated
            private String code;
            @Generated
            private String message;
            @Generated
            private Object details;
            @Generated
            private Map<String, String> fieldErrors;
            @Generated
            private String stackTrace;

            @Generated
            ErrorDetailsBuilder() {
            }

            @Generated
            public ErrorDetailsBuilder code(final String code) {
                this.code = code;
                return this;
            }

            @Generated
            public ErrorDetailsBuilder message(final String message) {
                this.message = message;
                return this;
            }

            @Generated
            public ErrorDetailsBuilder details(final Object details) {
                this.details = details;
                return this;
            }

            @Generated
            public ErrorDetailsBuilder fieldErrors(final Map<String, String> fieldErrors) {
                this.fieldErrors = fieldErrors;
                return this;
            }

            @Generated
            public ErrorDetailsBuilder stackTrace(final String stackTrace) {
                this.stackTrace = stackTrace;
                return this;
            }

            @Generated
            public ErrorDetails build() {
                return new ErrorDetails(this.code, this.message, this.details, this.fieldErrors, this.stackTrace);
            }

            @Generated
            public String toString() {
                String var10000 = this.code;
                return "ApiResponse.ErrorDetails.ErrorDetailsBuilder(code=" + var10000 + ", message=" + this.message + ", details=" + String.valueOf(this.details) + ", fieldErrors=" + String.valueOf(this.fieldErrors) + ", stackTrace=" + this.stackTrace + ")";
            }
        }
    }
}
