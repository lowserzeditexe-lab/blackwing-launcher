package com.blackwing.core;

import com.blackwing.core.adapters.LegacyVersion;
import com.blackwing.core.config.CoreSettings;
import com.blackwing.core.hud.HudModule;
import com.blackwing.core.profile.ClientProfile;
import java.util.Arrays;
import java.util.List;

public final class BlackwingCore {
    public CoreSettings defaults() {
        return CoreSettings.defaults();
    }

    public List<HudModule> defaultHudModules() {
        return Arrays.asList(
            new HudModule("toggle-sprint", "Toggle Sprint", true, 12, 12),
            new HudModule("armor-status", "Armor Status", true, 12, 42),
            new HudModule("keystrokes", "Keystrokes", true, 12, 72)
        );
    }

    public ClientProfile recommendedProfile(final LegacyVersion version) {
        switch (version) {
            case V1_7_10:
                return new ClientProfile(
                    "legacy",
                    "Legacy",
                    version.getVersionName(),
                    1536,
                    Arrays.asList("-XX:+UseG1GC")
                );
            case V1_9_4:
                return new ClientProfile(
                    "arena",
                    "Arena",
                    version.getVersionName(),
                    2048,
                    Arrays.asList("-XX:+UseG1GC", "-XX:MaxGCPauseMillis=50")
                );
            case V1_8_9:
            default:
                return ClientProfile.ranked();
        }
    }
}
