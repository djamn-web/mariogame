import { config } from './Config.js';
import { messages } from './Messages.js';
import { AssetConfig } from './AssetConfig.js';
import { Menu } from './Menu.js';
import { FinishedLevel, FinishedLastLevel } from './LevelFinish.js';

// global vars
let lastfire = 0;
let counter = 0;
let isMusicMuted = false;
let fails = 0;
let jumps = 0;
let score = 0;
let coinsAmount = 0;
let totalPossibleCoinsInLevel = 0;
let totalPossiblePointsInLevel = 0;
let sliderValue = config.elementSettings.initialSliderValue;
let alreadyPreloaded = false;
let isSettingsMenuActive = config.elementSettings.isSettingsMenuInitiallyActive;
let isDying = false;
let maxFireballs = config.fire.maxFireballs;

// General
let mario, camera, map, level, currentLevel, currentLevelName;

// background
let clouds, green, darkgreen;

// Layers
let enemyLayer, floorLayer, backgroundLayer;
let marioFloorLayerCollider, marioEnemyLayerCollider, marioPlatformsCollider, marioBulletsCollider;

// Keys
let hotkeys, cursors;
let isMovingLeft, isMovingRight, isJump, isFire;

// Objects
let bullets, fireballs, platforms, coins, goombas, goombaWalls;

// Texts
let scoreText, failsText, jumpsText, coinsText;

// music
let music, stageclear, death, coinsound, jumpsound, pop, fire;

// Elements handling
let volumeSlider, sliderMinus, sliderPlus, reloadGameButton, homeButton, fullscreenButton;
let snowflakes = [];

class Preload {
    preload() {
        AssetConfig.images.forEach(image => {
            this.load.image(image.key, image.path);
        });

        AssetConfig.audio.forEach(sound => {
            this.load.audio(sound.key, sound.path);
        });

        AssetConfig.spritesheets.forEach(sheet => {
            this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
        });

        AssetConfig.tilemaps.forEach(map => {
            this.load.tilemapTiledJSON(map.key, map.path);
        });
    }

    create() {
        music = this.sound.add('theme', { loop: true });
        jumpsound = this.sound.add('jumpsound');
        stageclear = this.sound.add('clear');
        death = this.sound.add('lose');
        fire = this.sound.add('fireball');
        pop = this.sound.add('pop');
        coinsound = this.sound.add('coinsound');

        music.setVolume(sliderValue);
        jumpsound.setVolume(sliderValue);
        stageclear.setVolume(sliderValue);
        death.setVolume(sliderValue);
        fire.setVolume(sliderValue);
        pop.setVolume(sliderValue);
        coinsound.setVolume(sliderValue);

        this.anims.create({
            key: config.player.frames.framesName,
            frames: this.anims.generateFrameNumbers('mario', { frames: config.player.frames.walkingAnimation }),
            frameRate: config.player.frames.frameRate
        });

        this.anims.create({
            key: config.goomba.frames.framesName,
            frames: this.anims.generateFrameNumbers('goomba', { frames: config.goomba.frames.walkingAnimation }),
            frameRate: config.goomba.frames.frameRate
        });

        this.scene.start(config.startScene);
    }
}

class BaseLevel extends Phaser.Scene {
    // TODO extract url
    preload() {
        const graphics = this.add.graphics();
        graphics.fillStyle(config.snowflake.colorHex, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('snowflake', 16, 16);
        graphics.destroy();

        if (!alreadyPreloaded) {
            this.load.scenePlugin({
                key: 'rexuiplugin',
                url: 'game/assets/phaser/rexuiplugin.min.js',
                sceneKey: 'rexUI'
            });
            alreadyPreloaded = true;
        }
    }

    create() {
        if (!music.isPlaying) { music.play(); }
        currentLevel = config.startCurrentLevel;
        currentLevelName = levels[currentLevel - 1].name;
        map = this.make.tilemap({ key: levels[currentLevel - 1].name }); //Creates Tilemap with name map

        // Background
        clouds = this.add.tileSprite(0, 0, map.widthInPixels, map.heightInPixels, 'clouds').setOrigin(0, 0);
        green = this.add.tileSprite(0, map.heightInPixels - 540, map.widthInPixels, 640, 'bushes').setOrigin(0, 0);
        darkgreen = this.add.tileSprite(0, map.heightInPixels - 480, map.widthInPixels, 480, 'trees').setOrigin(0, 0);

        // Layer creation
        const floorTiles = map.addTilesetImage('mariotiles');
        floorLayer = map.createLayer('boden', floorTiles, 0, 0);
        floorLayer.setCollisionBetween(1, 400);
        backgroundLayer = map.createLayer('hintergrund', floorTiles, 0, 0);
        enemyLayer = map.createLayer('enemy', floorTiles, 0, 0);
        enemyLayer.setCollisionBetween(1, 400); // It is possible to collide with all enemy layer

        // World border
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels, 128, true, true, false, true);

        // Player settings
        mario = map.createFromObjects('gameobjects', {
            name: 'mario',
            key: 'mario',
        })[0]

        this.physics.world.enable(mario);
        mario.setDepth(1)
        mario.body.setCollideWorldBounds(config.player.collideWithWorldBounds);
        mario.body.setSize(config.player.sizeX, config.player.sizeY)
        mario.setScale(config.player.scaleX, config.player.scaleY)
        mario.setFlipX(config.player.initialFlip);
        mario.body.setMaxVelocity(config.player.maxVelocityX, config.player.maxVelocityY);  //the player will fall through plattforms if gravity is accelerating it to more than 1000px/s
        isDying = false;

        // Camera
        camera = this.cameras.main;
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.startFollow(mario, true, 0.05, 0.05)

        // Hotkeys
        cursors = this.input.keyboard.createCursorKeys();
        hotkeys = this.input.keyboard.addKeys({
            left: 'A',
            right: 'D',
            jump: 'W',
            shoot1: 'F',
            shoot2: 'M',
            jump2: 'SPACE'
        });

        // Collision handling
        marioFloorLayerCollider = this.physics.add.collider(mario, floorLayer);
        marioEnemyLayerCollider = this.physics.add.collider(mario, enemyLayer, playerDie, null, this); // Call die function when mario collides with enemyLayerItem

        // // overlap checks need to be made after colliders
        // // object1, object2, collideCallback, processCallback, callbackContext)
        this.physics.add.overlap(mario, enemyLayer, null, null, this);

        this.createMainButtons();
        if (!this.sys.game.device.os.desktop || (this.sys.game.device.os.desktop && config.elementSettings.showMobileButtonsOnDesktop)) this.createMobileButtons();
        this.initializeObjectLayer();
        this.createTexts();

        // Snowflakes handling   
        if (config.snowyLevels.includes(currentLevelName) || config.showSnow) {
            this.time.addEvent({
                delay: config.snowflake.createDelayMs,
                callback: this.createSnowflake,
                callbackScope: this,
                loop: true
            })
        }
    }

    update() {
        if (!isDying && (cursors.left.isDown || hotkeys.left.isDown || isMovingLeft)) { // Left movement
            mario.anims.play(config.player.frames.framesName, true);
            mario.setFlipX(!config.player.initialFlip);
            mario.body.setVelocityX(config.player.moveLeftVelocity);
        } else if (!isDying && (cursors.right.isDown || hotkeys.right.isDown || isMovingRight)) { // Right movement
            mario.anims.play(config.player.frames.framesName, true);
            mario.body.setVelocityX(config.player.moveRightVelocity);
            mario.setFlipX(config.player.initialFlip);
        } else { // If player stands still -> No movement, frame 3
            mario.body.setVelocityX(0);
            if (!isDying) mario.setFrame(config.player.frames.standingStillFrame);
        }

        if (!isDying && (Phaser.Input.Keyboard.JustDown(hotkeys.jump) || Phaser.Input.Keyboard.JustDown(hotkeys.jump2) || Phaser.Input.Keyboard.JustDown(cursors.up))) {
            jump();
        }

        // If player is not on floor and jumps -> frame 5
        if (!isDying && (!onFloor() && hotkeys.jump.isDown || !onFloor() && hotkeys.jump2.isDown || !onFloor() && cursors.up.isDown || !onFloor() && isJump)) { mario.setFrame(config.player.frames.jumpFrame); }

        if (!isDying && mario.body.y > map.heightInPixels) { playerDie(false); }
        if (!isDying && isFire) mario.setFrame(config.player.frames.fireFrame);

        if (!isDying && (hotkeys.shoot1.isDown || hotkeys.shoot2.isDown)) {
            mario.setFrame(config.player.frames.fireFrame);
            shoot();
        }

        // parallax
        green.x = camera.scrollX * 0.5;
        darkgreen.x = camera.scrollX * 0.3;
        clouds.x = camera.scrollX * 0.8;

        bullets.forEach(bullet => {
            if (bullet && bullet.active && bullet.data && bullet.data.values) {
                const setbackX = bullet.data.values.bullet_setback_x;
                const setbackY = bullet.data.values.bullet_setback_y;

                let shouldSetback = false;

                // Check X direction
                if (setbackX !== undefined || setbackX !== -1) {
                    if (bullet.body.velocity.x > 0) {
                        shouldSetback = bullet.x >= setbackX;
                    } else if (bullet.body.velocity.x < 0) {
                        shouldSetback = bullet.x <= setbackX;
                    }
                }

                // Check Y direction (if X didn't trigger)
                if (!shouldSetback && setbackY !== undefined || setbackY !== -1) {
                    if (bullet.body.velocity.y > 0) {
                        shouldSetback = bullet.y >= setbackY;
                    } else if (bullet.body.velocity.y < 0) {
                        shouldSetback = bullet.y <= setbackY;
                    }
                }

                if (shouldSetback) {
                    bullet.setPosition(bullet.startingX, bullet.startingY);
                }
            }
        })

        goombas.forEach(goomba => {
            if (goomba && goomba.active && !goomba.hit) {
                goomba.anims.play(config.goomba.frames.framesName, true)
            }
        })

        snowflakes = snowflakes.filter(snowflake => {
            if (snowflake.y >= map.widthInPixels) {
                snowflake.destroy();
                return false;
            }
            return true;
        })

        music.setVolume(sliderValue);
        jumpsound.setVolume(sliderValue);
        stageclear.setVolume(sliderValue);
        death.setVolume(sliderValue);
        fire.setVolume(sliderValue);
        pop.setVolume(sliderValue);
        coinsound.setVolume(sliderValue);
    }

    createSnowflake() {
        const x = Phaser.Math.Between(0, map.widthInPixels);
        const y = 0;
        const scale = Phaser.Math.FloatBetween(config.snowflake.scaleMin, config.snowflake.scaleMax);
        const alpha = Phaser.Math.FloatBetween(config.snowflake.alphaMin, config.snowflake.alphaMax);
        const speed = Phaser.Math.Between(config.snowflake.speedMin, config.snowflake.speedMax);
        const drift = Phaser.Math.Between(config.snowflake.driftMin, config.snowflake.driftMax);

        let snowflake = this.add.sprite(x, y, 'snowflake');
        this.physics.world.enable(snowflake);

        snowflake.setScale(scale);
        snowflake.body.setAllowGravity(false);
        snowflake.setAlpha(alpha);
        snowflake.body.setVelocity(drift, speed);

        // spinning 360 degrees instead of falling down just with drifting
        this.tweens.add({
            targets: snowflake,
            angle: config.snowflake.spinningAngle,
            duration: Phaser.Math.Between(config.snowflake.spinningDurationMin, config.snowflake.spinningDurationMax),
            repeat: -1
        });

        snowflakes.push(snowflake);
    }

    createText(x, y, text, fontSize, fillColor, stroke, strokeThickness, fontStyle = "normal") {
        return this.add.text(x, y, text, { fontSize: fontSize, fill: fillColor, stroke: stroke, strokeThickness: strokeThickness, fontStyle: fontStyle }).setScrollFactor(0);
    }

    createMainButtons() {
        const canvasWidth = config.canvas.width;
        const buttonWidth = config.elementSettings.generalButtonWidth;
        const buttonHeight = config.elementSettings.generalButtonHeight;
        const gap = config.elementSettings.gapBetweenButtons;

        let buttonX = canvasWidth - buttonWidth / 2 - gap; // Right-aligned with padding
        let buttonY = buttonHeight / 2 + gap; // Starts with a top padding

        if (!this.sys.game.device.os.desktop || (this.sys.game.device.os.desktop && config.elementSettings.showFullscreenButtonOnDesktop)) fullscreenButton = this.createButton(buttonX - buttonWidth - gap, buttonY, 'fullscreenbutton', () => toggleFullscreenMode(), null, config.hovercolor, false, true);

        const settingsButton = this.createButton(buttonX, buttonY, 'settingsbutton', () => toggleSettingsMenu(false), null, '0xA1A1A1', false, true);
        buttonY += settingsButton.height + gap;

        reloadGameButton = this.createButton(buttonX, buttonY, 'reloadbutton', () => restartGame(), null, config.hovercolor, false, true);
        buttonY += reloadGameButton.height + gap;

        homeButton = this.createButton(buttonX, buttonY, 'menubutton', () => stopGame(), null, config.hovercolor, false, true);
        buttonY += homeButton.height + gap + 70;

        // https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-overview/
        let alreadyInitialized = false;
        volumeSlider = this.rexUI.add.slider({
            x: buttonX,
            y: buttonY,
            width: config.elementSettings.sliderWidth,
            height: config.elementSettings.sliderHeight,
            orientation: 'y',
            value: 1 - sliderValue,

            track: {
                width: 1, height: 1,
                radius: 5,
                color: 1000, alpha: 1,
                shape: 'rectangle'
            },

            thumb: {
                width: 10, height: 10,
                radius: 10,
                color: 0x256, alpha: 1,
                // strokeColor: undefined, strokeAlpha: 1, strokeWidth: 2,
                shape: 'rectangle'
            },

            space: {
                left: 4,
                right: 4,
                // top: 4,
                // bottom: 4
            },

            input: 'pan', // 'drag'|'click'null
            valuechangeCallback: function (value) {
                if (alreadyInitialized) sliderValue = 1 - value;
            },
        }).layout();
        volumeSlider.setScrollFactor(0);
        alreadyInitialized = true;

        sliderPlus = this.createText(volumeSlider.x, volumeSlider.y - volumeSlider.height, '+', '28px', '#000', '#000', 1)
        sliderPlus.setOrigin(0.5, -1.1);

        sliderMinus = this.createText(volumeSlider.x, volumeSlider.y + volumeSlider.height, '-', '28px', '#000', '#000', 1)
        sliderMinus.setOrigin(0.5, 2);

        toggleSettingsMenu(true);
    }

    createMobileButtons() {
        const jumpbutton = this.createButton(config.canvas.width - 70, config.canvas.height - 70, 'jumpbutton', () => { jump(); isJump = true }, () => isJump = false, '#000', true, false)
        this.createButton(jumpbutton.x - jumpbutton.width - 35, config.canvas.height - 70, 'firebutton', () => { shoot(); isFire = true }, () => isFire = false, '#000', true, false)

        // Left + Right Button
        const leftButton = this.createButton(config.leftRightButtonPosition, config.canvas.height - 70, 'leftbutton', () => isMovingLeft = true, () => isMovingLeft = false, '#000', true, false);
        this.createButton(config.leftRightButtonPosition + leftButton.width, config.canvas.height - 70, 'rightbutton', () => isMovingRight = true, () => isMovingRight = false, '#000', true, false);
    }

    createButton(x, y, texture, onClick, onClickFinished = null, tintColor = null, showTintForPointerClick, showTintForPointerOver) {
        const button = this.add.sprite(x, y, texture).setInteractive();
        button.setScrollFactor(0);
        button.on('pointerdown', onClick);

        if (tintColor && showTintForPointerClick) {
            button.on('pointerdown', function () { this.setTint(tintColor); });
            button.on('pointerup', function () { this.clearTint(); });
            button.on('pointerout', function () { this.clearTint(); });
        }

        if (tintColor && showTintForPointerOver) {
            button.on('pointerover', function () { this.setTint(tintColor); });
            button.on('pointerout', function () { this.clearTint(); });
        }

        if (onClickFinished) {
            button.on('pointerup', onClickFinished);
            button.on('pointerout', onClickFinished)
        }

        return button;
    }

    initializeObjectLayer() {
        let whiteplatforms = this.createPlatformsAndAddTweens(map, 'white', 0);
        let brownplatforms = this.createPlatformsAndAddTweens(map, 'brown', 1);

        let platforms = this.physics.add.group({ immovable: true, allowGravity: false });
        platforms.addMultiple(whiteplatforms);
        platforms.addMultiple(brownplatforms);

        bullets = map.createFromObjects('gameobjects', {
            name: 'bullet',
            key: 'bullet',
        })

        const redBullets = map.createFromObjects('gameobjects', {
            name: 'bullet-red',
            key: 'bullet-red',
        });

        bullets.push(...redBullets);

        bullets.forEach(bullet => {
            this.physics.world.enable(bullet);
            bullet.body.allowGravity = false;
            bullet.body.immovable = true;

            bullet.startingX = bullet.x;
            bullet.startingY = bullet.y;

            if (bullet.data && bullet.data.values) bullet.body.setVelocity(bullet.data.values.velocity_x ?? 0, bullet.data.values.velocity_y ?? 0);

            totalPossiblePointsInLevel += config.bullet.bulletHitPoints;
        })

        let finishFlags = map.createFromObjects('gameobjects', {
            name: 'flag',
            key: 'flag',
        })

        finishFlags.forEach(finishFlag => {
            this.physics.world.enable(finishFlag);
            finishFlag.body.allowGravity = false;
            finishFlag.body.immovable = true;
        })

        coins = map.createFromObjects('gameobjects', {
            name: 'coin',
            key: 'coins',
        })

        coins.forEach(coin => {
            this.physics.world.enable(coin);
            coin.body.setBounceY(Phaser.Math.FloatBetween(config.coins.minBounce, config.coins.maxBounce));
            coin.body.setCircle(config.coins.circleRadius)
            coin.setScale(config.coins.scale);
            totalPossiblePointsInLevel += config.coins.coinPoints;
            totalPossibleCoinsInLevel++;
        })

        goombas = map.createFromObjects('gameobjects', {
            name: 'goomba',
            key: 'goomba',
        })


        goombas.forEach(goomba => {
            this.physics.world.enable(goomba);
            goomba.body.setCollideWorldBounds(config.goomba.collideWithWorldBounds);
            goomba.body.setCircle(config.goomba.circleRadius); //.setSize for rectangle
            goomba.body.setOffset(config.goomba.offsetX, config.goomba.offsetY);        // Positions image inside the rectangle/circle
            goomba.setScale(config.goomba.scaleX, config.goomba.scaleY)
            goomba.setFlipX(config.goomba.initialFlip);
            goomba.active = true;
            goomba.hit = false;
            goomba.body.setVelocityX(config.goomba.velocityX);
            totalPossiblePointsInLevel += config.goomba.goombaHitPoints;
        })

        goombaWalls = map.createFromObjects('gameobjects', {
            name: 'wall',
        })

        goombaWalls.forEach(goombaWall => {
            this.physics.world.enable(goombaWall);
            goombaWall.body.immovable = true;
            goombaWall.body.allowGravity = false;
            goombaWall.visible = false
        })

        // var shape = this.rexUI.add.roundRectangle(goombas[0].x, goombas[0].y - goombas[0].height/2, 1,1, 1, 0x000);

        this.physics.add.overlap(mario, finishFlags, handleFinish, null, this);
        this.physics.add.overlap(mario, goombas, handleGoombaHit, null, this);
        this.physics.add.overlap(mario, coins, collectCoins, null, this);
        this.physics.add.overlap(goombas, goombaWalls, handleGoombaWallCollision, null, this);

        this.physics.add.collider(goombas, floorLayer);
        marioPlatformsCollider = this.physics.add.collider(mario, platforms, mptouchedown);
        marioBulletsCollider = this.physics.add.collider(mario, bullets, playerDie, null, this);
        this.physics.add.collider(coins, floorLayer);
        this.physics.add.collider(coins, enemyLayer);
    }

    createPlatformsAndAddTweens(map, objectName, frameIndex) {
        const platforms = map.createFromObjects('gameobjects', {
            name: objectName,  // Only 'objectName' elements will be selected
            key: 'platforms',
            frame: frameIndex
        });

        platforms.forEach((gameObject) => {
            // Tween for every game object will be created
            this.tweens.add({
                targets: gameObject,
                y: gameObject.data.values.y_end_height,
                duration: gameObject.data.values.duration, // Use the custom duration from Tiled
                ease: gameObject.data.values.ease,
                yoyo: gameObject.data.values.yoyo,
                repeat: gameObject.data.values.repeat,
            });
        });

        return platforms;
    }

    createTexts() {
        // Text
        scoreText = this.createText(16, 16, messages.score_message.replace("{0}", score).replace("{1}", totalPossiblePointsInLevel), '22px', '#000', '#000', 0, "bold");
        coinsText = this.createText(16, 40, messages.coins_message.replace("{0}", coinsAmount).replace("{1}", totalPossibleCoinsInLevel), '22px', '#000', '#000', 0, "bold");
        failsText = this.createText(16, 64, messages.failscounter_message + fails, '22px', '#000', '#000', 0, "bold");
        jumpsText = this.createText(16, 88, messages.jumpscounter_message + jumps, '22px', '#000', '#000', 0, "bold");
    }

}

class Level1 extends BaseLevel {
    preload() {
        super.preload();
    }

    create() {
        level = this;
        super.create();
    }

    update() {
        super.update();
    }
}

class Level2 extends BaseLevel {
    preload() {
        super.preload();
    }

    create() {
        level = this;
        super.create();
    }

    update() {
        super.update();
    }
}

class Level3 extends BaseLevel {
    preload() {
        super.preload();
    }

    create() {
        level = this;
        super.create();
    }

    update() {
        super.update();
    }
}

class Level4 extends BaseLevel {
    preload() {
        super.preload();
    }

    create() {
        level = this;
        super.create();
    }

    update() {
        super.update();
    }
}



//mario dies - Settings
function playerDie(showDieAnimation = true) {
    if (isDying) return;

    music.stop();
    death.play();

    if (showDieAnimation) {
        mario.anims.stop(config.player.frames.framesName);
        mario.setFrame(6);
        isDying = true;

        level.physics.world.removeCollider(marioFloorLayerCollider);
        level.physics.world.removeCollider(marioEnemyLayerCollider);
        level.physics.world.removeCollider(marioPlatformsCollider);
        level.physics.world.removeCollider(marioBulletsCollider);

        level.time.delayedCall(1650, () => {
            incrementFails();
            restartGame();
        }, [], this)
    } else {
        incrementFails();
        restartGame();
    }
}

function restartGame() {
    resetVariables(false, false);
    level.scene.restart();
    music.stop();
}

function stopGame() {
    resetVariables(true, true);
    music.stop();
    alreadyPreloaded = false;
    level.scene.stop();
    game.scene.start("menu");
    // closeFullscreenMode();
}

function toggleSettingsMenu(initialToggle = false) {
    const toggleableElements = [volumeSlider, homeButton, reloadGameButton, sliderMinus, sliderPlus /*fullscreenButton*/];

    const setVisibility = (isVisible) => {
        toggleableElements.forEach(element => element.setVisible(isVisible));
    };

    if (initialToggle) {
        const isVisible = config.elementSettings.isSettingsMenuInitiallyActive;
        setVisibility(isVisible);
        isSettingsMenuActive = isVisible;
    } else {
        setVisibility(!isSettingsMenuActive);
        isSettingsMenuActive = !isSettingsMenuActive;
    }
}

function shoot() {
    let fireball;

    if (level.time.now > lastfire && maxFireballs > 0) {
        lastfire = level.time.now + config.fire.delay;

        if (mario.flipX) {
            fireball = level.physics.add.sprite(mario.x - 20, mario.y, 'fireball');
            fireball.setVelocity(-config.fire.fireballVelocityX, config.fire.fireballVelocityY);
        } else {
            fireball = level.physics.add.sprite(mario.x + 20, mario.y, 'fireball');
            fireball.setVelocity(config.fire.fireballVelocityX, config.fire.fireballVelocityY);
        }

        fireball.body.allowGravity = true;
        fireball.body.setCircle(config.fire.circleRadius);
        maxFireballs--;
        fire.play();

        level.physics.add.collider(fireball, platforms, mptouchedown);
        level.physics.add.collider(fireball, floorLayer);
        level.physics.add.collider(fireball, enemyLayer);
        level.physics.add.collider(fireball, coins);
        level.physics.add.overlap(fireball, bullets, destroyEnemy, null, this);
        level.physics.add.overlap(fireball, goombas, destroyEnemy, null, this);

        level.time.delayedCall(config.fire.lifespan, function () {
            maxFireballs++;
            fireball.destroy();
        }, [], this);
    }
}

// Resets variables
function resetVariables(resetCounter, resetLevels) {
    if (resetCounter) {
        fails = 0;
        jumps = 0;
    }

    if (resetLevels) currentLevel = config.startCurrentLevel;

    totalPossiblePointsInLevel = 0;
    totalPossibleCoinsInLevel = 0;
    coinsAmount = 0;
    score = 0;
    lastfire = 0;
    isMovingLeft = false;
    isMovingRight = false;
    maxFireballs = config.fire.maxFireballs;
}

function destroyEnemy(fireball, entity) {
    let points = 0;

    if (entity.name === config.bullet.name) points = config.bullet.bulletHitPoints;
    else if (entity.name === config.goomba.name) points = config.goomba.goombaHitPoints;

    updateScoreText(points);
    pop.play();
    entity.destroy();
}

function handleGoombaWallCollision(goomba, tile) {
    goomba.setFlipX(!goomba.flipX);
    goomba.body.velocity.x *= -1;
}

function handleGoombaHit(mario, goomba) {
    if (goomba.hit) return;

    let marioBottom = mario.y + mario.body.height / 2;
    let goombaTop = goomba.y - goomba.body.height / 2;

    if (marioBottom >= goombaTop - config.goomba.collisionTolerance && marioBottom <= goombaTop + config.goomba.collisionTolerance) {
        // Mario lands on Goomba
        goomba.anims.stop(config.goomba.frames.framesName);
        goomba.setFrame(config.goomba.frames.dieFrame);
        goomba.body.setVelocity(0, 0);
        goomba.hit = true;

        updateScoreText(config.goomba.goombaHitPoints);
        mario.body.velocity.y = config.goomba.playerHitJumpHeight;
        pop.play();

        level.time.delayedCall(config.goomba.despawnTime, function () {
            goomba.destroy();
        }, [], this);
    } else playerDie(true);
}

function jump() {
    if (isValidJump()) {
        if (counter == 0) mario.body.velocity.y = config.player.jumpHeight;
        else mario.body.velocity.y = config.player.doubleJumpHeight;
        incrementJumps();
        jumpsound.play();
        counter++;
    }
}

function isValidJump() {
    return isOnFloor() || counter <= 1;
}

function isOnFloor() {
    if (onFloor() || mario.body.touching.down) {
        counter = 0;
        return true;
    }
    return false;
}

// Handle finish -> increment level, if level > exist => finishAll, otherwise finish + neues Level
function handleFinish() {
    currentLevel++;
    config.startCurrentLevel = currentLevel;

    this.scene.stop();
    if (currentLevel <= levels.length) {
        alreadyPreloaded = false;
        this.scene.start("finishedlevel", { music: music, nextLevel: nextLevel, stageclear: stageclear, score: score, maxScore: totalPossiblePointsInLevel });
    } else {
        this.scene.start("finishedlastlevel", { music: music, backToMenu: backToMenu, stageclear: stageclear, score: score, maxScore: totalPossiblePointsInLevel });
    }
}

function nextLevel() {
    resetVariables(true, true);
    this.scene.stop();
    this.scene.start(levels[currentLevel - 1].name);
}

// action to move back to menu after last level
function backToMenu() {
    resetVariables(true, true);
    this.scene.stop();
    this.scene.start("menu");
}

//platforms collider
function mptouchedown(mplayer, mplatform) {
    if (mplatform.body.touching.up && mplayer.body.touching.down) {
        mplayer.body.blocked.down = false;
    }
}

// coins collecting
function collectCoins(mario, coin) {
    coin.destroy();

    updateScoreText(config.coins.coinPoints);
    coinsAmount++;
    coinsText.setText(messages.coins_message.replace("{0}", coinsAmount).replace("{1}", totalPossibleCoinsInLevel));

    coinsound.play();
}

// fails counter
function incrementFails() {
    fails += 1;
    failsText.setText(messages.failscounter_message + fails);
}

// updates score points
function updateScoreText(points) {
    score += points
    scoreText.setText(messages.score_message.replace("{0}", score).replace("{1}", totalPossiblePointsInLevel));
}

// jumps counter
function incrementJumps() {
    jumps += 1;
    jumpsText.setText(messages.jumpscounter_message + jumps);
}

function onFloor() {
    return mario.body.onFloor();
}

function toggleFullscreenMode() {
    if (game.scale.isFullscreen) game.scale.stopFullscreen()
    else {
        if (level.sys.game.device.os.desktop) {
            game.scale.startFullscreen();
        } else {
            // Better Fullscreen Handling for Mobile Device
            let canvas = level.sys.game.canvas;
            let fullscreen = level.sys.game.device.fullscreen;
            canvas[fullscreen.request]();

            const fullscreenHint = level.add.text(config.canvas.width / 2, config.canvas.height / 1.6, messages.fullscreen_landscape_hit, {
                fontSize: '30px',
                fill: 'red',
                align: 'center',
                stroke: 'darkred',
                strokeThickness: 1.5
            }).setScrollFactor(0).setOrigin(0.5);

            const landscapeIcon = level.add.image(config.canvas.width / 2, config.canvas.height / 2.2, 'landscape-icon').setScrollFactor(0).setOrigin(0.5);;

            level.time.delayedCall(config.fullscreenHintDisplayDuration, function () {
                fullscreenHint.destroy();
                landscapeIcon.destroy();
            })
        }
    }
}

function closeFullscreenMode() {
    if (game.scale.isFullscreen) game.scale.stopFullscreen()
}

var levels = [
    { name: 'level1', classRef: Level1 },
    { name: 'level2', classRef: Level2 },
    { name: 'level3', classRef: Level3 },
    { name: 'level4', classRef: Level4 },
];

var game = new Phaser.Game(config.canvas);  //main game instance - using the config object

game.scene.add("finishedlevel", FinishedLevel);
game.scene.add("finishedlastlevel", FinishedLastLevel);
game.scene.add("preload", Preload);
game.scene.add("menu", Menu);

levels.forEach(level => {
    game.scene.add(level.name, level.classRef);
})

game.scene.start("preload");