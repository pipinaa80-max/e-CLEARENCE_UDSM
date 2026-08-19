

package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Generated;

public class ChangePasswordRequest {
    private @NotBlank(
            message = "Current password is required"
    ) @Size(
            min = 6,
            max = 100,
            message = "Password must be between 6 and 100 characters"
    ) String currentPassword;
    private @NotBlank(
            message = "New password is required"
    ) @Size(
            min = 6,
            max = 100,
            message = "Password must be between 6 and 100 characters"
    ) String newPassword;
    private @NotBlank(
            message = "Confirm password is required"
    ) String confirmPassword;

    @Generated
    public static ChangePasswordRequestBuilder builder() {
        return new ChangePasswordRequestBuilder();
    }

    @Generated
    public String getCurrentPassword() {
        return this.currentPassword;
    }

    @Generated
    public String getNewPassword() {
        return this.newPassword;
    }

    @Generated
    public String getConfirmPassword() {
        return this.confirmPassword;
    }

    @Generated
    public void setCurrentPassword(final String currentPassword) {
        this.currentPassword = currentPassword;
    }

    @Generated
    public void setNewPassword(final String newPassword) {
        this.newPassword = newPassword;
    }

    @Generated
    public void setConfirmPassword(final String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof ChangePasswordRequest)) {
            return false;
        } else {
            ChangePasswordRequest other = (ChangePasswordRequest)o;
            if (!other.canEqual(this)) {
                return false;
            } else {
                Object this$currentPassword = this.getCurrentPassword();
                Object other$currentPassword = other.getCurrentPassword();
                if (this$currentPassword == null) {
                    if (other$currentPassword != null) {
                        return false;
                    }
                } else if (!this$currentPassword.equals(other$currentPassword)) {
                    return false;
                }

                Object this$newPassword = this.getNewPassword();
                Object other$newPassword = other.getNewPassword();
                if (this$newPassword == null) {
                    if (other$newPassword != null) {
                        return false;
                    }
                } else if (!this$newPassword.equals(other$newPassword)) {
                    return false;
                }

                Object this$confirmPassword = this.getConfirmPassword();
                Object other$confirmPassword = other.getConfirmPassword();
                if (this$confirmPassword == null) {
                    if (other$confirmPassword != null) {
                        return false;
                    }
                } else if (!this$confirmPassword.equals(other$confirmPassword)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof ChangePasswordRequest;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $currentPassword = this.getCurrentPassword();
        result = result * 59 + ($currentPassword == null ? 43 : $currentPassword.hashCode());
        Object $newPassword = this.getNewPassword();
        result = result * 59 + ($newPassword == null ? 43 : $newPassword.hashCode());
        Object $confirmPassword = this.getConfirmPassword();
        result = result * 59 + ($confirmPassword == null ? 43 : $confirmPassword.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getCurrentPassword();
        return "ChangePasswordRequest(currentPassword=" + var10000 + ", newPassword=" + this.getNewPassword() + ", confirmPassword=" + this.getConfirmPassword() + ")";
    }

    @Generated
    public ChangePasswordRequest() {
    }

    @Generated
    public ChangePasswordRequest(final String currentPassword, final String newPassword, final String confirmPassword) {
        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
        this.confirmPassword = confirmPassword;
    }

    @Generated
    public static class ChangePasswordRequestBuilder {
        @Generated
        private String currentPassword;
        @Generated
        private String newPassword;
        @Generated
        private String confirmPassword;

        @Generated
        ChangePasswordRequestBuilder() {
        }

        @Generated
        public ChangePasswordRequestBuilder currentPassword(final String currentPassword) {
            this.currentPassword = currentPassword;
            return this;
        }

        @Generated
        public ChangePasswordRequestBuilder newPassword(final String newPassword) {
            this.newPassword = newPassword;
            return this;
        }

        @Generated
        public ChangePasswordRequestBuilder confirmPassword(final String confirmPassword) {
            this.confirmPassword = confirmPassword;
            return this;
        }

        @Generated
        public ChangePasswordRequest build() {
            return new ChangePasswordRequest(this.currentPassword, this.newPassword, this.confirmPassword);
        }

        @Generated
        public String toString() {
            return "ChangePasswordRequest.ChangePasswordRequestBuilder(currentPassword=" + this.currentPassword + ", newPassword=" + this.newPassword + ", confirmPassword=" + this.confirmPassword + ")";
        }
    }
}
