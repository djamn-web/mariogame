import { Config } from './Config.js';
import { messages } from './Messages.js';
import { AssetConfig } from './AssetConfig.js';
import { Menu } from './Menu.js';
import { FinishedLevel, FinishedLastLevel } from './LevelFinish.js';

// global vars
let lastfire = 0;
let counter = 0;
let isMusicMuted = false;
let fails = 0;
let totalFails = 0;
let jumps = 0;
let score = 0;
let coinsAmount = 0;
let totalPossibleCoinsInLevel = 0;
let totalPossiblePointsInLevel = 0;
let sliderValue = Config.elementSettings.initialSliderValue;
let alreadyPreloaded = false;
let isSettingsMenuActive = Config.elementSettings.isSettingsMenuInitiallyActive;
let isDying = false;
let maxFireballs = Config.fire.maxFireballs;

// General
let mario, camera, map, level, currentLevel, currentLevelName;

// background
let skyLayer, middleLayer, foregroundLayer;

// Layers
let enemyLayer, floorLayer, backgroundLayer;

// Keys
let hotkeys, cursors;
let isMovingLeft, isMovingRight, isJump, isFire;

// Objects
let bullets, fireballs, platforms, coins, goombas, goombaWalls, breakingIces;

// Texts
let scoreText, failsText, jumpsText, coinsText;

// music
let music, stageclear, death, coinsound, jumpsound, pop, fire;

// Elements handling
let volumeSlider, sliderMinus, sliderPlus, reloadGameButton, homeButton, fullscreenButton;
let snowflakes = [];

class Preload {
    preload() {
        for (const image of AssetConfig.images) {
            this.load.image(image.key, image.path);
        }

        for (const sound of AssetConfig.audio) {
            this.load.audio(sound.key, sound.path);
        }

        for (const sheet of AssetConfig.spritesheets) {
            this.load.spritesheet(sheet.key, sheet.path, {
                frameWidth: sheet.frameWidth,
                frameHeight: sheet.frameHeight
            });
        }

        for (const map of AssetConfig.tilemaps) {
            this.load.tilemapTiledJSON(map.key, map.path);
        }
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
            key: Config.player.frames.framesName,
            frames: this.anims.generateFrameNumbers('mario', { frames: Config.player.frames.walkingAnimation }),
            frameRate: Config.player.frames.frameRate
        });

        this.anims.create({
            key: Config.goomba.frames.framesName,
            frames: this.anims.generateFrameNumbers('goomba', { frames: Config.goomba.frames.walkingAnimation }),
            frameRate: Config.goomba.frames.frameRate
        });

        this.anims.create({
            key: Config.breakingIce.frames.framesName,
            frames: this.anims.generateFrameNumbers('breaking-ice', { frames: Config.breakingIce.frames.breakingAnimation }),
            frameRate: Config.breakingIce.frames.frameRate,
            repeat: Config.breakingIce.frames.repeat,
            hideOnComplete: false
        });

        this.scene.start(Config.startScene);
    }
}

class BaseLevel extends Phaser.Scene {
    // TODO extract url
    preload() {
        const graphics = this.add.graphics();
        graphics.fillStyle(Config.snowflake.colorHex, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('snowflake', 16, 16);
        graphics.destroy();

        if (!this.rexUI || !alreadyPreloaded) {
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
        currentLevel = Config.startCurrentLevel;
        currentLevelName = levels[currentLevel - 1].name;
        map = this.make.tilemap({ key: levels[currentLevel - 1].name }); //Creates Tilemap with name map

        // Background
        skyLayer = this.add.tileSprite(0, 0, map.widthInPixels, map.heightInPixels, 'clouds').setOrigin(0, 0);
        middleLayer = this.add.tileSprite(0, map.heightInPixels - 540, map.widthInPixels, 640, 'bushes').setOrigin(0, 0);
        foregroundLayer = this.add.tileSprite(0, map.heightInPixels - 480, map.widthInPixels, 480, 'trees').setOrigin(0, 0);

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
        mario.body.setCollideWorldBounds(Config.player.collideWithWorldBounds);
        mario.body.setSize(Config.player.sizeX, Config.player.sizeY)
        mario.setScale(Config.player.scaleX, Config.player.scaleY)
        mario.body.height = mario.displayHeight; // body.height is initially height in objectlayer not scaled height
        mario.body.width = mario.body.displayWidth;
        mario.setFlipX(Config.player.initialFlip);
        mario.body.setMaxVelocity(Config.player.maxVelocityX, Config.player.maxVelocityY);  //the player will fall through plattforms if gravity is accelerating it to more than 1000px/s
        mario.colliders = {};
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
        mario.colliders.floorLayerCollider = this.physics.add.collider(mario, floorLayer);
        mario.colliders.enemyLayerCollider = this.physics.add.collider(mario, enemyLayer, playerDie, null, this); // Call die function when mario collides with enemyLayerItem

        // // overlap checks need to be made after colliders
        // // object1, object2, collideCallback, processCallback, callbackContext)
        this.physics.add.overlap(mario, enemyLayer, null, null, this);

        this.createMainButtons();
        if (!this.sys.game.device.os.desktop || (this.sys.game.device.os.desktop && Config.elementSettings.showMobileButtonsOnDesktop)) this.createMobileButtons();
        this.initializeObjectLayer();
        this.createTexts();

        // Snowflakes handling   
        if (Config.snowyLevels.includes(currentLevelName) || Config.showSnow) {
            this.time.addEvent({
                delay: Config.snowflake.createDelayMs,
                callback: this.createSnowflake,
                callbackScope: this,
                loop: true
            })
        }
    }

    update() {
        if (!isDying && (cursors.left.isDown || hotkeys.left.isDown || isMovingLeft)) { // Left movement
            mario.anims.play(Config.player.frames.framesName, true);
            mario.setFlipX(!Config.player.initialFlip);
            mario.body.setVelocityX(Config.player.moveLeftVelocity);
        } else if (!isDying && (cursors.right.isDown || hotkeys.right.isDown || isMovingRight)) { // Right movement
            mario.anims.play(Config.player.frames.framesName, true);
            mario.body.setVelocityX(Config.player.moveRightVelocity);
            mario.setFlipX(Config.player.initialFlip);
        } else { // If player stands still -> No movement, frame 3
            mario.body.setVelocityX(0);
            if (!isDying) mario.setFrame(Config.player.frames.standingStillFrame);
        }

        if (Config.player.cheat && !isDying && cursors.up.isDown) {
            fly();
        }

        if (!Config.player.cheat && !isDying && (Phaser.Input.Keyboard.JustDown(hotkeys.jump) || Phaser.Input.Keyboard.JustDown(hotkeys.jump2) || Phaser.Input.Keyboard.JustDown(cursors.up))) {
            jump();
        }

        // If player is not on floor and jumps -> frame 5
        if (!isDying && (!onFloor() && hotkeys.jump.isDown || !onFloor() && hotkeys.jump2.isDown || !onFloor() && cursors.up.isDown || !onFloor() && isJump)) { mario.setFrame(Config.player.frames.jumpFrame); }

        if (!isDying && mario.body.y > map.heightInPixels) { playerDie(false); }
        if (!isDying && isFire) mario.setFrame(Config.player.frames.fireFrame);

        if (!isDying && (hotkeys.shoot1.isDown || hotkeys.shoot2.isDown)) {
            mario.setFrame(Config.player.frames.fireFrame);
            shoot();
        }

        // parallax
        middleLayer.x = camera.scrollX * 0.5;
        foregroundLayer.x = camera.scrollX * 0.3;
        skyLayer.x = camera.scrollX * 0.8;

        for (const bullet of bullets) {
            if (bullet?.active && bullet.data?.values) {
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
        }

        for (const goomba of goombas) {
            if (goomba?.active && !goomba.hit) {
                goomba.anims.play(Config.goomba.frames.framesName, true)
            }
        }

        snowflakes = snowflakes.filter(snowflake => {
            if (snowflake.y >= map.widthInPixels) {
                snowflake.destroy();
                return false;
            }
            return true;
        })

        for (const breakingIce of breakingIces) {
            handleBreakingIce(breakingIce);
        }

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
        const scale = Phaser.Math.FloatBetween(Config.snowflake.scaleMin, Config.snowflake.scaleMax);
        const alpha = Phaser.Math.FloatBetween(Config.snowflake.alphaMin, Config.snowflake.alphaMax);
        const speed = Phaser.Math.Between(Config.snowflake.speedMin, Config.snowflake.speedMax);
        const drift = Phaser.Math.Between(Config.snowflake.driftMin, Config.snowflake.driftMax);

        let snowflake = this.add.sprite(x, y, 'snowflake');
        this.physics.world.enable(snowflake);

        snowflake.setScale(scale);
        snowflake.body.setAllowGravity(false);
        snowflake.setAlpha(alpha);
        snowflake.body.setVelocity(drift, speed);

        // spinning 360 degrees instead of falling down just with drifting
        this.tweens.add({
            targets: snowflake,
            angle: Config.snowflake.spinningAngle,
            duration: Phaser.Math.Between(Config.snowflake.spinningDurationMin, Config.snowflake.spinningDurationMax),
            repeat: -1
        });

        snowflakes.push(snowflake);
    }

    createText(x, y, text, fontSize, fillColor, stroke, strokeThickness, fontStyle = "normal") {
        return this.add.text(x, y, text, { fontSize: fontSize, fill: fillColor, stroke: stroke, strokeThickness: strokeThickness, fontStyle: fontStyle }).setScrollFactor(0);
    }

    createMainButtons() {
        const canvasWidth = Config.canvas.width;
        const buttonWidth = Config.elementSettings.generalButtonWidth;
        const buttonHeight = Config.elementSettings.generalButtonHeight;
        const gap = Config.elementSettings.gapBetweenButtons;

        let buttonX = canvasWidth - buttonWidth / 2 - gap; // Right-aligned with padding
        let buttonY = buttonHeight / 2 + gap; // Starts with a top padding

        if (!this.sys.game.device.os.desktop || (this.sys.game.device.os.desktop && Config.elementSettings.showFullscreenButtonOnDesktop)) fullscreenButton = this.createButton(buttonX - buttonWidth - gap, buttonY, 'fullscreenbutton', Config.hovercolor, false, true, () => toggleFullscreenMode());

        const settingsButton = this.createButton(buttonX, buttonY, 'settingsbutton', '0xA1A1A1', false, true, () => toggleSettingsMenu(false));
        buttonY += settingsButton.height + gap;

        reloadGameButton = this.createButton(buttonX, buttonY, 'reloadbutton', Config.hovercolor, false, true, () => restartGame());
        buttonY += reloadGameButton.height + gap;

        homeButton = this.createButton(buttonX, buttonY, 'menubutton', Config.hovercolor, false, true, () => stopGame());
        buttonY += homeButton.height + gap + 70;

        // https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-overview/
        let alreadyInitialized = false;
        volumeSlider = this.rexUI.add.slider({
            x: buttonX,
            y: buttonY,
            width: Config.elementSettings.sliderWidth,
            height: Config.elementSettings.sliderHeight,
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
        const jumpbutton = this.createButton(Config.canvas.width - 70, Config.canvas.height - 70, 'jumpbutton', '#000', true, false, () => { jump(); isJump = true }, () => isJump = false,)
        this.createButton(jumpbutton.x - jumpbutton.width - 35, Config.canvas.height - 70, 'firebutton', '#000', true, false, () => { shoot(); isFire = true }, () => isFire = false)

        // Left + Right Button
        const leftButton = this.createButton(Config.leftRightButtonPosition, Config.canvas.height - 70, 'leftbutton', '#000', true, false, () => isMovingLeft = true, () => isMovingLeft = false,);
        this.createButton(Config.leftRightButtonPosition + leftButton.width, Config.canvas.height - 70, 'rightbutton', '#000', true, false, () => isMovingRight = true, () => isMovingRight = false);
    }

    createButton(x, y, texture, tintColor, showTintForPointerClick, showTintForPointerOver, onClick, onClickFinished = null,) {
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

        for (const bullet of bullets) {
            this.physics.world.enable(bullet);
            bullet.body.allowGravity = false;
            bullet.body.immovable = true;

            bullet.startingX = bullet.x;
            bullet.startingY = bullet.y;
            bullet.setDepth(1);

            if (bullet.data?.values) bullet.body.setVelocity(bullet.data.values.velocity_x ?? 0, bullet.data.values.velocity_y ?? 0);

            totalPossiblePointsInLevel += Config.bullet.bulletHitPoints;
        }

        let finishFlags = map.createFromObjects('gameobjects', {
            name: 'flag',
            key: 'flag',
        })

        for (const finishFlag of finishFlags) {
            this.physics.world.enable(finishFlag);
            finishFlag.body.allowGravity = false;
            finishFlag.body.immovable = true;
        }

        coins = map.createFromObjects('gameobjects', {
            name: 'coin',
            key: 'coins',
        })

        for (const coin of coins) {
            this.physics.world.enable(coin);
            coin.body.setBounceY(Phaser.Math.FloatBetween(Config.coins.minBounce, Config.coins.maxBounce));
            coin.body.setCircle(Config.coins.circleRadius)
            coin.setScale(Config.coins.scale);
            totalPossiblePointsInLevel += Config.coins.coinPoints;
            totalPossibleCoinsInLevel++;
        }

        breakingIces = map.createFromObjects('gameobjects', {
            name: 'breaking-ice',
            key: 'breaking-ice'
        })

        for (const breakingIce of breakingIces) {
            this.physics.world.enable(breakingIce);
            breakingIce.active = true;
            breakingIce.body.allowGravity = false;
            breakingIce.body.immovable = true;
            breakingIce.setFrame(Config.breakingIce.frames.initialFrame);
            breakingIce.timeoutActive = false;
            breakingIce.startTime = null;
        }

        goombas = map.createFromObjects('gameobjects', {
            name: 'goomba',
            key: 'goomba',
        })

        for (const goomba of goombas) {
            this.physics.world.enable(goomba);
            goomba.body.setCollideWorldBounds(Config.goomba.collideWithWorldBounds);
            goomba.body.setCircle(Config.goomba.circleRadius); //.setSize for rectangle
            goomba.body.setOffset(Config.goomba.offsetX, Config.goomba.offsetY);        // Positions image inside the rectangle/circle
            goomba.setScale(Config.goomba.scaleX, Config.goomba.scaleY)
            goomba.setFlipX(Config.goomba.initialFlip);
            goomba.active = true;
            goomba.hit = false;
            goomba.body.setVelocityX(Config.goomba.velocityX);
            totalPossiblePointsInLevel += Config.goomba.goombaHitPoints;
        }

        goombaWalls = map.createFromObjects('gameobjects', {
            name: 'wall',
        })

        for (const goombaWall of goombaWalls) {
            this.physics.world.enable(goombaWall);
            goombaWall.body.immovable = true;
            goombaWall.body.allowGravity = false;
            goombaWall.visible = false
        }

        // var shape = this.rexUI.add.roundRectangle(goombas[0].x, goombas[0].y - goombas[0].height/2, 1,1, 1, 0x000);

        this.physics.add.overlap(mario, finishFlags, handleFinish, null, this);
        this.physics.add.overlap(mario, goombas, handleGoombaHit, null, this);
        this.physics.add.overlap(mario, coins, collectCoins, null, this);
        this.physics.add.overlap(goombas, goombaWalls, handleGoombaWallCollision, null, this);

        this.physics.add.collider(goombas, floorLayer);
        mario.colliders.platformsCollider = this.physics.add.collider(mario, platforms, mptouchedown);
        mario.colliders.bulletsCollider = this.physics.add.collider(mario, bullets, playerDie, null, this);
        mario.colliders.iceCollider = this.physics.add.collider(mario, breakingIces);
        this.physics.add.collider(coins, floorLayer);
        this.physics.add.collider(coins, breakingIces);
        this.physics.add.collider(coins, enemyLayer);
    }

    createPlatformsAndAddTweens(map, objectName, frameIndex) {
        const platforms = map.createFromObjects('gameobjects', {
            name: objectName,  // Only 'objectName' elements will be selected
            key: 'platforms',
            frame: frameIndex
        });

        for (const platform of platforms) {
            // Tween for every game object will be created
            const values = platform.data.values;
            this.tweens.add({
                targets: platform,
                y: values.y_end_height,
                duration: values.duration, // Use the custom duration from Tiled
                ease: values.ease,
                yoyo: values.yoyo,
                repeat: values.repeat,
            });
        }

        return platforms;
    }

    createTexts() {
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

        skyLayer.destroy();
        middleLayer.destroy();
        foregroundLayer.destroy();

        skyLayer = this.add.tileSprite(0, 0, map.widthInPixels, map.heightInPixels, 'clouds-winter');
        skyLayer.setOrigin(0, 0)
        skyLayer.setDepth(-3);

        middleLayer = this.add.tileSprite(0, map.heightInPixels - 540, map.widthInPixels, 640, 'bushes-winter');
        middleLayer.setOrigin(0, 0)
        middleLayer.setDepth(-2);

        foregroundLayer = this.add.tileSprite(0, map.heightInPixels - 480, map.widthInPixels, 480, 'trees-winter');
        foregroundLayer.setOrigin(0, 0)
        foregroundLayer.setDepth(-1);
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


function handleBreakingIce(breakingIce) {
    if (!breakingIce.active) return;

    const iceAnimsConfig = Config.breakingIce.frames;
    const iceStartingX = breakingIce.x - 32 / 2;
    const iceStartingY = breakingIce.y - 32 / 2;
    const iceEndingX = iceStartingX + 32;

    const marioStartingX = mario.x - mario.body.width / 2;
    const marioEndingX = marioStartingX + mario.body.width;
    const mariobottomY = mario.y + mario.body.height / 2;

    const isOnIceY = Math.abs(mariobottomY - iceStartingY) < Config.breakingIce.toleranceYDifference;
    const isOverlappingX = marioEndingX > iceStartingX && marioStartingX < iceEndingX;

    if (isOnIceY && isOverlappingX) {
        if (!breakingIce.timeoutActive) {
            breakingIce.timeoutActive = true;
            breakingIce.startTime = Date.now();
        }

        if (!breakingIce.anims.isPlaying && !breakingIce.animationComplete) {
            breakingIce.anims.play(Config.breakingIce.frames.framesName);


            // if using additional wait time, waits on last frame
            breakingIce.once('animationcomplete', () => {
                breakingIce.animationComplete = true;
                breakingIce.setFrame(iceAnimsConfig.breakingAnimation.at(-1)); // same as: [iceAnimsConfig.breakingAnimation.length - 1]
            });
        }

        const timeElapsed = Date.now() - breakingIce.startTime;
        const animationDuration = (iceAnimsConfig.breakingAnimation.length / iceAnimsConfig.frameRate) * 1000; // in milliseconds
        const additionalWaitTime = (1 / iceAnimsConfig.frameRate) * iceAnimsConfig.additionalWaitTimeMultiplier;
        const totalTimeNeeded = animationDuration + additionalWaitTime;

        if (timeElapsed >= totalTimeNeeded) {
            breakingIce.destroy();
        }
    } else {
        breakingIce.anims.stop();
        breakingIce.setFrame(Config.breakingIce.frames.initialFrame);
        breakingIce.timeoutActive = false;
        breakingIce.startTime = null;
        breakingIce.animationComplete = false;
    }
}

//mario dies - Settings
function playerDie(showDieAnimation = true) {
    if (isDying) return;

    music.stop();
    death.play();

    if (showDieAnimation) {
        mario.anims.stop(Config.player.frames.framesName);
        mario.setFrame(6);
        isDying = true;

        level.physics.world.removeCollider(mario.colliders.iceCollider);
        level.physics.world.removeCollider(mario.colliders.floorLayerCollider);
        level.physics.world.removeCollider(mario.colliders.enemyLayerCollider);
        level.physics.world.removeCollider(mario.colliders.platformsCollider);
        level.physics.world.removeCollider(mario.colliders.bulletsCollider);

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
    resetVariables(true, true, true);
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
        const isVisible = Config.elementSettings.isSettingsMenuInitiallyActive;
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
        lastfire = level.time.now + Config.fire.delay;

        if (mario.flipX) {
            fireball = level.physics.add.sprite(mario.x - 20, mario.y, 'fireball');
            fireball.setVelocity(-Config.fire.fireballVelocityX, Config.fire.fireballVelocityY);
        } else {
            fireball = level.physics.add.sprite(mario.x + 20, mario.y, 'fireball');
            fireball.setVelocity(Config.fire.fireballVelocityX, Config.fire.fireballVelocityY);
        }

        fireball.body.allowGravity = true;
        fireball.body.setCircle(Config.fire.circleRadius);
        maxFireballs--;
        fire.play();

        level.physics.add.collider(fireball, platforms, mptouchedown);
        level.physics.add.collider(fireball, floorLayer);
        level.physics.add.collider(fireball, breakingIces);
        level.physics.add.collider(fireball, enemyLayer);
        level.physics.add.collider(fireball, coins);
        level.physics.add.overlap(fireball, bullets, destroyEnemy, null, this);
        level.physics.add.overlap(fireball, goombas, destroyEnemy, null, this);

        level.time.delayedCall(Config.fire.lifespan, function () {
            maxFireballs++;
            fireball.destroy();
        }, [], this);
    }
}

// Resets variables
// TODO refactor
function resetVariables(resetCounter, resetLevels, resetTotalFails = false) {
    if (resetCounter) {
        fails = 0;
        jumps = 0;
    }

    if (resetLevels) currentLevel = Config.startCurrentLevel;
    if (resetTotalFails) totalFails = 0;

    totalPossiblePointsInLevel = 0;
    totalPossibleCoinsInLevel = 0;
    coinsAmount = 0;
    score = 0;
    lastfire = 0;
    isMovingLeft = false;
    isMovingRight = false;
    maxFireballs = Config.fire.maxFireballs;
}

function destroyEnemy(fireball, entity) {
    let points = 0;

    if (entity.name === Config.bullet.name) points = Config.bullet.bulletHitPoints;
    else if (entity.name === Config.goomba.name) points = Config.goomba.goombaHitPoints;

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


    if (marioBottom >= goombaTop - Config.goomba.collisionTolerance && marioBottom <= goombaTop + Config.goomba.collisionTolerance) {
        // Mario lands on Goomba
        goomba.anims.stop(Config.goomba.frames.framesName);
        goomba.setFrame(Config.goomba.frames.dieFrame);
        goomba.body.setVelocity(0, 0);
        goomba.hit = true;
        goomba.body.checkCollision.none = true; // removes all colliders

        updateScoreText(Config.goomba.goombaHitPoints);
        mario.body.velocity.y = Config.goomba.playerHitJumpHeight;
        pop.play();

        level.time.delayedCall(Config.goomba.despawnTime, function () {
            goomba.destroy();
        }, [], this);
    } else playerDie(true);
}

function jump() {
    if (isValidJump()) {
        if (counter == 0) mario.body.velocity.y = Config.player.jumpHeight;
        else mario.body.velocity.y = Config.player.doubleJumpHeight;
        incrementJumps();
        jumpsound.play();
        counter++;
    }
}

function fly() {
    mario.body.velocity.y = Config.player.flySpeedY;
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
    Config.startCurrentLevel = currentLevel;
    totalFails += fails;

    this.scene.stop();
    if (currentLevel <= levels.length) {
        alreadyPreloaded = false;
        this.scene.start("finishedlevel", { music: music, nextLevel: nextLevel, stageclear: stageclear, score: score, maxScore: totalPossiblePointsInLevel, fails: fails });
    } else {
        this.scene.start("finishedlastlevel", { music: music, backToMenu: backToMenu, stageclear: stageclear, score: score, maxScore: totalPossiblePointsInLevel, fails: fails, totalFails: totalFails });
    }
}

function nextLevel() {
    resetVariables(true, true);
    this.scene.stop();
    this.scene.start(levels[currentLevel - 1].name);
}

// action to move back to menu after last level
function backToMenu() {
    resetVariables(true, true, true);
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

    updateScoreText(Config.coins.coinPoints);
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
    const { scale, device, canvas } = game;
    const { os, fullscreen } = device;

    if (scale.isFullscreen) {
        return scale.stopFullscreen();
    }

    if (level.sys.game.device.os.desktop) {
        return scale.startFullscreen();
    }

    canvas[fullscreen.request]();
    showMobileFullscreenHint();

    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape')
            .then(() => console.log('Screen orientation locked to landscape'))
            .catch((err) => console.log('Orientation lock failed:', err.name));
    }
}

function showMobileFullscreenHint() {
    const cx = Config.canvas.width / 2;
    const hintY = Config.canvas.height / 1.6;
    const iconY = Config.canvas.height / 2.2;

    const fullscreenHint = level.add.text(cx, hintY, messages.fullscreen_landscape_hit, {
        fontSize: '30px',
        fill: 'red',
        align: 'center',
        stroke: 'darkred',
        strokeThickness: 1.5
    }).setScrollFactor(0).setOrigin(0.5);

    const landscapeIcon = level.add.image(cx, iconY, 'landscape-icon')
        .setScrollFactor(0)
        .setOrigin(0.5);

    level.time.delayedCall(Config.fullscreenHintDisplayDuration, () => {
        fullscreenHint.destroy();
        landscapeIcon.destroy();
    });
}

function closeFullscreenMode() {
    if (game.scale.isFullscreen) game.scale.stopFullscreen()
}

let levels = [
    { name: 'level1', classRef: Level1 },
    { name: 'level2', classRef: Level2 },
    { name: 'level3', classRef: Level3 },
    { name: 'level4', classRef: Level4 },
];

let game = new Phaser.Game(Config.canvas);  //main game instance - using the Config object

game.scene.add("finishedlevel", FinishedLevel);
game.scene.add("finishedlastlevel", FinishedLastLevel);
game.scene.add("preload", Preload);
game.scene.add("menu", Menu);

levels.forEach(level => {
    game.scene.add(level.name, level.classRef);
})

game.scene.start("preload");