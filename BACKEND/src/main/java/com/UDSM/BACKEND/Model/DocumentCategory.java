package com.UDSM.BACKEND.Model;

public enum DocumentCategory {
    TRANSCRIPT("Transcript"),
    O_LEVEL_CERTIFICATE("O-Level Certificate"),
    A_LEVEL_CERTIFICATE("A-Level Certificate"),
    DIPLOMA_CERTIFICATE("Diploma Certificate"),
    UNDERGRADUATE_CERTIFICATE("Undergraduate Certificate"),
    IDENTITY_DOCUMENT("Identity Document"),
    PASSPORT("Passport"),
    NATIONAL_ID("National ID"),
    VOTER_ID("Voter ID"),
    DRIVING_LICENCE("Driving Licence"),
    EMPLOYEE_ID("Employee ID"),
    OTHER("Other");

    private final String displayName;

    DocumentCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static DocumentCategory fromDisplayName(String displayName) {
        if (displayName == null) return OTHER;
        for (DocumentCategory category : DocumentCategory.values()) {
            if (category.getDisplayName().equalsIgnoreCase(displayName.trim()) ||
                category.name().equalsIgnoreCase(displayName.trim().replace(" ", "_").replace("-", "_"))) {
                return category;
            }
        }
        if (displayName.toLowerCase().contains("diploma")) {
            return DIPLOMA_CERTIFICATE;
        }
        return OTHER;
    }
}