package com.fieldops.entity.enums;

public enum Status {
    OPEN,
    ASSIGNED,
    IN_PROGRESS,
    RESOLVED;

    /**
     * The one place that decides which status changes a technician may make.
     * Work only moves forward: ASSIGNED -> IN_PROGRESS -> RESOLVED,
     * and ASSIGNED -> RESOLVED is allowed for quick fixes. Anything else,
     * including going backwards or staying the same, is rejected.
     */
    public boolean canMoveTo(Status next) {
        return switch (this) {
            case ASSIGNED -> next == IN_PROGRESS || next == RESOLVED;
            case IN_PROGRESS -> next == RESOLVED;
            case OPEN, RESOLVED -> false;
        };
    }
}
