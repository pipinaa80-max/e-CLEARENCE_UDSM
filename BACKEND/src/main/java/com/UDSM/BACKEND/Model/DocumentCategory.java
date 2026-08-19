package com.UDSM.BACKEND.Model;

public enum DocumentCategory {
    TRANSCRIPT("Transcript"),
    O_LEVEL_CERTIFICATE("O-Level Certificate"),
    A_LEVEL_CERTIFICATE("A-Level Certificate"),
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
        for (DocumentCategory category : DocumentCategory.values()) {
            if (category.getDisplayName().equalsIgnoreCase(displayName)) {
                return category;
            }
        }
        return OTHER;
    }
}