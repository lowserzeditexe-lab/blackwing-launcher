package com.blackwing.core.adapters;

public interface VersionAdapter {
    LegacyVersion targetVersion();
    boolean supportsModule(String moduleId);
    String adapterName();
}
