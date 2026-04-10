package com.blackwing.core.profile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class ClientProfile {
    private final String id;
    private final String displayName;
    private final String targetMinecraftVersion;
    private final int memoryMb;
    private final List<String> jvmArgs;

    public ClientProfile(
        final String id,
        final String displayName,
        final String targetMinecraftVersion,
        final int memoryMb,
        final List<String> jvmArgs
    ) {
        this.id = id;
        this.displayName = displayName;
        this.targetMinecraftVersion = targetMinecraftVersion;
        this.memoryMb = memoryMb;
        this.jvmArgs = new ArrayList<String>(jvmArgs);
    }

    public static ClientProfile ranked() {
        return new ClientProfile(
            "ranked",
            "Ranked",
            "1.8.9",
            2048,
            java.util.Arrays.asList("-XX:+UseG1GC", "-XX:+UseStringDeduplication")
        );
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getTargetMinecraftVersion() {
        return targetMinecraftVersion;
    }

    public int getMemoryMb() {
        return memoryMb;
    }

    public List<String> getJvmArgs() {
        return Collections.unmodifiableList(jvmArgs);
    }
}
