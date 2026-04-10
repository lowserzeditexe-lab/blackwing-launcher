package com.blackwing.core.hud;

public final class HudModule {
    private final String id;
    private final String displayName;
    private final boolean enabled;
    private final int anchorX;
    private final int anchorY;

    public HudModule(
        final String id,
        final String displayName,
        final boolean enabled,
        final int anchorX,
        final int anchorY
    ) {
        this.id = id;
        this.displayName = displayName;
        this.enabled = enabled;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getAnchorX() {
        return anchorX;
    }

    public int getAnchorY() {
        return anchorY;
    }
}
