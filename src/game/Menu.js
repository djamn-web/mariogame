import { config } from './config.js';
import { messages } from './messages.js';

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

        this.createText(widthLine1, height / 1.5, messages.menu_level1, '28px', '#000', '#000', 0.5);
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 1;
            this.scene.start("level1")
        });
        widthLine1 += generalLevelWidth;

        this.createText(widthLine1, height / 1.5, messages.menu_level2, '28px', '#000', '#000', 0.5);
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 2;
            this.scene.start("level2")
        });
        widthLine1 += generalLevelWidth;

        this.createText(widthLine1, height / 1.5, messages.menu_level3, '28px', '#000', '#000', 0.5);
        this.createButton(widthLine1, height / 1.8, 'button', () => {
            config.startCurrentLevel = 3;
            this.scene.start("level3")
        });
        widthLine1 += generalLevelWidth;

        this.createText(widthLine1, height / 1.5, messages.menu_level4, '28px', '#000', '#000', 0.5);
        this.createText(widthLine1, height / 1.35, messages.nan, '28px', 'darkred', '#000', 0);
        this.createButton(widthLine1, height / 1.8, 'button', () => console.log("No level"));

        this.createText(width * 0.9, height * 0.9, version, "18px", '#000', '#000', 0);
    }

    createText(x, y, text, fontSize, fillColor, stroke, strokeThickness) {
        this.add.text(x, y, text, { fontSize: fontSize, fill: fillColor, stroke: stroke, strokeThickness: strokeThickness }).setOrigin(0.5, 0);
    }

    createButton(x, y, texture, onClickCallback) {
        const button = this.add.sprite(x, y, texture).setInteractive();

        button.on('pointerdown', onClickCallback);
        button.on('pointerover', () => button.setTint(config.hovercolor));
        button.on('pointerout', () => button.clearTint());
    }
}