import { Config } from './configs/Config.js';
import { levelsConfig } from './configs/LevelsConfig.js';
import { messages } from './Messages.js';

export class Menu {
    init() {
        this.currentPage = 0;
        this.levelsPerPage = 4;
        this.activeElements = [];
    }


    create() {
        const { width, height } = Config.canvas;
        const version = `${messages.version} ${Config.version}`
        const baseTitleHeight = height * 0.15;

        // or this.sys.game.Config.height
        this.add.tileSprite(0, 0, width * 2, height * 2, 'clouds').setOrigin(0, 0);
        

        this.createText(width * 0.5, baseTitleHeight, 'menu_header', '32px', '#000', '#000', 0.4);
        this.createText(width * 0.5, baseTitleHeight + (height * 0.1), 'menu_sub', '30px', '#000', '#000', 0.4);
        this.createText(width * 0.9, height * 0.05, version, "18px", '#000', '#000', 0);

        this.renderPage();
    }

    renderPage() {
        this.activeElements.forEach(element => element.destroy());
        this.activeElements = [];

        const { width, height } = Config.canvas;
        const generalLevelWidth = width * 0.20;

        const baseHeight = height / 2;
        const titleY = baseHeight + (height * 0.11);
        const descY = baseHeight + (height * 0.185);
        const sparkleY = baseHeight + (height * 0.214);

        let currentX = generalLevelWidth;

        const startIndex = this.currentPage * this.levelsPerPage;
        const endIndex = startIndex + this.levelsPerPage;
        const levelsToShow = levelsConfig.slice(startIndex, endIndex);

        levelsToShow.forEach(level => {
            const btn = this.createButton(currentX, baseHeight, 'button', () => {
                Config.startCurrentLevel = level.id;
                this.scene.start(level.scene);
            });

            const titleText = this.createText(currentX, titleY, level.titleKey, '28px', '#000', '#000', 0.5, "bold");

            this.activeElements.push(titleText);

            if (level.isNew) {
                const sparkles = this.createSparkles(currentX, sparkleY);
                this.activeElements.push(...sparkles);
            }

            if (level.descriptionKey) {
                const shadow = { offsetX: 1, offsetY: 1, color: "#b80c0cff", blur: 1, stroke: false, fill: true };
                const descText = this.createText(currentX, descY, level.descriptionKey, '28px', 'darkred', '#000', 0, "bold", shadow);
                this.activeElements.push(descText);
            }


            this.activeElements.push(btn);

            currentX += generalLevelWidth;
        });

        this.renderPaginationControls();
    }

    renderPaginationControls() {
        const { width, height } = Config.canvas;
        const totalPages = Math.ceil(levelsConfig.length / this.levelsPerPage);
        const buttonHeight = height * 0.9;

        // Previous Page Button
        if (this.currentPage > 0) {
            const prevBtn = this.createButton(width * 0.1, buttonHeight, 'prevbutton', () => {
                this.currentPage--;
                this.renderPage();
            });

            this.activeElements.push(prevBtn);
        }

        // Next Page Button
        if (this.currentPage < totalPages - 1) {
            const nextBtn = this.createButton(width * 0.9, buttonHeight, 'nextbutton', () => {
                this.currentPage++;
                this.renderPage();
            });

            this.activeElements.push(nextBtn);
        }
    }

    createSparkles(x, y) {
        const sparkleCount = 20;
        const colors = [0xffd700, 0xffffe0, 0xffffff, 0xff6b6b]; // Gold, light yellow, white, red
        const sparkleElements = [];

        for (let i = 0; i < sparkleCount; i++) {
            const angle = (i / sparkleCount) * Math.PI * 2;
            const distance = 120 + Math.random();
            const sparkleX = x + Math.cos(angle) * distance * 0.8; // TODO make dynmic (for christmas: 35 count, 1.3 distance)
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

            sparkleElements.push(sparkle);
        }
        return sparkleElements;
    }

    createText(x, y, textOrKey, fontSize, fillColor, stroke, strokeThickness, fontStyle = "normal", shadow = undefined) {
        const textToRender = messages[textOrKey] !== undefined ? messages[textOrKey] : textOrKey;

        return this.add.text(x, y, textToRender, { fontSize: fontSize, fill: fillColor, stroke: stroke, strokeThickness: strokeThickness, fontStyle: fontStyle, shadow: shadow }).setOrigin(0.5, 0);
    }

    createButton(x, y, texture, onClickCallback) {
        const button = this.add.sprite(x, y, texture).setInteractive();

        button.on('pointerdown', onClickCallback);
        button.on('pointerover', () => button.setTint(Config.hovercolor));
        button.on('pointerout', () => button.clearTint());

        return button;
    }
}