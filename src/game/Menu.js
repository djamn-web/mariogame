import { config } from './Config.js';
import { messages } from './Messages.js';

export class Menu {
    create() {
        const { width, height } = config.canvas;
        const generalLevelWidth = width * 0.2;
        let widthLine1 = generalLevelWidth;
        const version = `${messages.version} ${config.version}`

        // or this.sys.game.config.height
        this.add.tileSprite(0, 0, width * 2, height * 2, 'clouds').setOrigin(0, 0);

        this.createText(width * 0.5, height / 5.0, messages.menu_header, '32px', '#000', '#000', 0.4);
        this.createText(width * 0.5, height / 3.6, messages.menu_sub, '30px', '#000', '#000', 0.4);

        this.createText(widthLine1, height / 1.5, messages.menu_level1, '28px', '#000', '#000', 0.5, "bold");
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 1;
            this.scene.start("level1")
        });
        widthLine1 += generalLevelWidth;

        this.createText(widthLine1, height / 1.5, messages.menu_level2, '28px', '#000', '#000', 0.5, "bold");
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 2;
            this.scene.start("level2")
        });
        widthLine1 += generalLevelWidth;

        this.createText(widthLine1, height / 1.5, messages.menu_level3, '28px', '#000', '#000', 0.5, "bold");
        this.createSparkles(widthLine1, height / 1.30);

        const shadow = {offsetX: 1, offsetY: 1, color:"#b80c0cff", blur:1, stroke:false, fill:true}

        this.createText(widthLine1, height / 1.35, "Christmas Special", '28px', 'darkred', '#000', 0, "bold", shadow);
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 3;
            this.scene.start("level3")
        });
        widthLine1 += generalLevelWidth;

        this.createText(widthLine1, height / 1.5, messages.menu_level4, '28px', '#000', '#000', 0.5, "bold");
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 4;
            this.scene.start("level4")
        });

        this.createText(width * 0.9, height * 0.9, version, "18px", '#000', '#000', 0);
    }

    createSparkles(x, y) {
        const sparkleCount = 35;
        const colors = [0xffd700, 0xffffe0, 0xffffff, 0xff6b6b]; // Gold, light yellow, white, red
        
        for (let i = 0; i < sparkleCount; i++) {
            const angle = (i / sparkleCount) * Math.PI * 2;
            const distance = 120 + Math.random();
            const sparkleX = x + Math.cos(angle) * distance * 1.3;
            const sparkleY = y + Math.sin(angle) * distance * 0.2;
            
            const sparkle = this.add.circle(sparkleX, sparkleY, 3, colors[Math.floor(Math.random() * colors.length)], 0.8);
            
            this.tweens.add({
                targets: sparkle,
                alpha: 0,
                scale: 1.5,
                duration: 800 + Math.random() * 400,
                delay: Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createText(x, y, text, fontSize, fillColor, stroke, strokeThickness, fontStyle = "normal", shadow = undefined) {
        this.add.text(x, y, text, { fontSize: fontSize, fill: fillColor, stroke: stroke, strokeThickness: strokeThickness, fontStyle: fontStyle, shadow: shadow }).setOrigin(0.5, 0);
    }

    createButton(x, y, texture, onClickCallback) {
        const button = this.add.sprite(x, y, texture).setInteractive();

        button.on('pointerdown', onClickCallback);
        button.on('pointerover', () => button.setTint(config.hovercolor));
        button.on('pointerout', () => button.clearTint());
    }
}