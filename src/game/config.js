class config {
    static canvas = {
        type: Phaser.AUTO,  // Which renderer to use
        width: 1000,         // Canvas width in pixels
        height: 480,        // Canvas height in pixels
        parent: "preview",   // ID of the DOM element to add the canvas to
        input: {
            activePointers: 10, // Support up to 10 simultaneous touches
        },
        physics: {
            default: 'arcade',       // Which physics engine to use
            arcade: {
                gravity: { y: 1200 },
                debug: false              // paint debug information (hitboxes) ee
            }
        },
    };

    static version = "3.1.0";       // MajorUpdate.MinorChanges.Fixes
    static hovercolor = 0xFFB93C;               // Hovercolor of buttons
    static startScene = "level1";               // Needs to be determined with startCurrentLevel together (when selecting level)
    static startCurrentLevel = 1;
    static finishLevelScreenTime = 5500;        // Determines how long the finish screen should be shown (in ms)
    static leftRightButtonPosition = 100;
    static fullscreenHintDisplayDuration = 3000;
    static snowyLevels = ["level1"];            // Show snow in specific levels
    static showSnow = true;                     // General value to show snow in all levels or only specific ones

    static player = {
        collideWithWorldBounds: true,
        sizeX: 25,
        sizeY: 50,
        circleRadius: 24.4,
        scaleX: 0.9,
        scaleY: 0.9,
        maxVelocityX: 500,
        maxVelocityY: 1000,
        initialFlip: false,
        jumpHeight: -500,
        doubleJumpHeight: -400,
        moveLeftVelocity: -300,
        moveRightVelocity: 300,
        frames: {
            frameRate: 10,
            jumpFrame: 5,
            fireFrame: 8,
            standingStillFrame: 0,
            framesName: 'mario-walk',
            walkingAnimation: [1, 2, 3, 4, 3, 2],
        }
    }

    static snowflake = {
        colorHex: 0xffffff,
        createDelayMs: 120,
        scaleMin: 0.5,
        scaleMax: 1.1,
        speedMin: 10,
        speedMax: 20,
        driftMin: -30,
        driftMax: 30,
        alphaMin: 0.5,
        alphaMax: 0.8,
        spinningAngle: 360,
        spinningDurationMin: 3000,
        spinningDurationMax: 6000
    }

    static goomba = {
        name: 'goomba',
        collideWithWorldBounds: true,
        circleRadius: 22.5,
        scaleX: 0.8,
        scaleY: 0.8,
        offsetX: 4,
        offsetY: 0,
        goombaHitPoints: 30,
        despawnTime: 500,
        initialFlip: true,
        velocityX: 30,
        collisionTolerance: 5,
        playerHitJumpHeight: -300,
        frames: {
            frameRate: 16,
            dieFrame: 16,
            framesName: 'goomba-walk',
            walkingAnimation: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        }
    }

    static fire = {
        delay: 150,
        maxFireballs: 3,
        fireballVelocityX: 300,
        fireballVelocityY: -100,
        circleRadius: 7,
        lifespan: 1500,         // how long fireballs exist in ms
    }

    static coins = {
        minBounce: 0.4,
        maxBounce: 0.8,
        scale: 0.8,              // Makes the coins smaller
        coinPoints: 10,
        circleRadius: 15,
    }

    static elementSettings = {
        isSettingsMenuInitiallyActive: false,
        showFullscreenButtonOnDesktop: false,
        showMobileButtonsOnDesktop: false,
        initialSliderValue: 1,
        sliderWidth: 20,
        sliderHeight: 120,
        // All Settings Buttons should have the same width/height
        generalButtonWidth: 50,
        generalButtonHeight: 50,
        gapBetweenButtons: 5,
    }

    static bullet = {
        name: 'bullet',
        bulletHitPoints: 20,
    }
}

export { config };