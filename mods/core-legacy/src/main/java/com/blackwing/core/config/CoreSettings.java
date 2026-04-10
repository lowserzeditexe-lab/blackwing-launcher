package com.blackwing.core.config;

public final class CoreSettings {
    private final String locale;
    private final String themeId;
    private final boolean disableParticles;
    private final boolean disableAnimations;
    private final boolean disableFog;
    private final boolean disableInternalShaders;
    private final boolean minimalHud;
    private final boolean toggleSprintEnabled;
    private final boolean armorStatusEnabled;

    public CoreSettings(
        final String locale,
        final String themeId,
        final boolean disableParticles,
        final boolean disableAnimations,
        final boolean disableFog,
        final boolean disableInternalShaders,
        final boolean minimalHud,
        final boolean toggleSprintEnabled,
        final boolean armorStatusEnabled
    ) {
        this.locale = locale;
        this.themeId = themeId;
        this.disableParticles = disableParticles;
        this.disableAnimations = disableAnimations;
        this.disableFog = disableFog;
        this.disableInternalShaders = disableInternalShaders;
        this.minimalHud = minimalHud;
        this.toggleSprintEnabled = toggleSprintEnabled;
        this.armorStatusEnabled = armorStatusEnabled;
    }

    public static CoreSettings defaults() {
        return new CoreSettings("fr", "amoled-black-white", true, true, true, true, true, true, true);
    }

    public String getLocale() {
        return locale;
    }

    public String getThemeId() {
        return themeId;
    }

    public boolean isDisableParticles() {
        return disableParticles;
    }

    public boolean isDisableAnimations() {
        return disableAnimations;
    }

    public boolean isDisableFog() {
        return disableFog;
    }

    public boolean isDisableInternalShaders() {
        return disableInternalShaders;
    }

    public boolean isMinimalHud() {
        return minimalHud;
    }

    public boolean isToggleSprintEnabled() {
        return toggleSprintEnabled;
    }

    public boolean isArmorStatusEnabled() {
        return armorStatusEnabled;
    }
}
