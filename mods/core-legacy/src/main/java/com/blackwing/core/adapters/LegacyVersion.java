package com.blackwing.core.adapters;

public enum LegacyVersion {
    V1_7_10("1.7.10"),
    V1_8_9("1.8.9"),
    V1_9_4("1.9.4");

    private final String versionName;

    LegacyVersion(final String versionName) {
        this.versionName = versionName;
    }

    public String getVersionName() {
        return versionName;
    }
}
