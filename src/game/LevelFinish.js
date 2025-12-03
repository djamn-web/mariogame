import { config } from './Config.js';
import { messages } from './Messages.js';

const { width, height } = config.canvas;

export class FinishedLevel extends Phaser.Scene {
    create(data) {
        this.add.tileSprite(0, 0, width * 2, height * 2, 'clouds').setOrigin(0, 0);

        createText(this, width * 0.5, height / 3, messages.title_won, '40px', '#000', '#000', 0.8)
        createText(this, width * 0.5, height / 2.3, getFinishScoreMessage(data), '25px', '#000', '#000', 0.5)
        createText(this, width * 0.42, height / 2.0, getFinishFailsMessage(data), '25px', '#000', '#000', 0.5)
        createText(this, width * 0.5, height / 1.6, messages.title_won_sub, '32px', '#000', '#000', 0.5)

        data.music.stop()
        data.stageclear.play();

        handleParticles(this, false);

        this.time.delayedCall(config.finishLevelScreenTime, data.nextLevel, [], this)
    }
}

export class FinishedLastLevel extends Phaser.Scene {
    create(data) {
        this.add.tileSprite(0, 0, width * 2, height * 2, 'clouds').setOrigin(0, 0);

        createText(this, width * 0.5, height / 3.5, messages.title_won_all, '40px', 'orange', 'red', 0.8)
        createText(this, width * 0.5, height / 2.5, messages.title_won_all_sub, '35px', '#000', '#000', 0.6)
        createText(this, width * 0.5, height / 2.1, getFinishScoreMessage(data), '25px', '#000', '#000', 0.5)
        createText(this, width * 0.42, height / 1.9, getFinishFailsMessage(data), '25px', '#000', '#000', 0.5)
        createText(this, width * 0.5, height / 1.5, messages.reload, '32px', '#000', '#000', 0.6)

        data.music.stop()
        data.stageclear.play();

        handleParticles(this, true);

        this.time.delayedCall(config.finishLevelScreenTime, data.backToMenu, [], this)
    }
}

// https://rexrainbow.github.io/phaser3-rex-notes/docs/site/text/
// https://newdocs.phaser.io/docs/3.60.0/Phaser.GameObjects.Particles.ParticleEmitter
function handleParticles(object, finishedAllLevels) {
    const particles1 = object.add.particles(-5, height + 5, 'whiteparticle', {
        speed: { min: 500, max: 200 },
        lifespan: 500,
        quantity: 4,
        gravityY: 30,
        scale: { start: 0.1, end: 0.1 },
        blendMode: 'ADD',
        angle: { min: 270, max: 359 },
    });

    const particles2 = object.add.particles(-5, height + 5, 'greenparticle', {
        speed: { min: 500, max: 200 },
        lifespan: 550,
        quantity: 4,
        gravityY: 30,
        scale: { start: 0.1, end: 0.2 },
        blendMode: 'ADD',
        angle: { min: 270, max: 359 },
        active: false
    });

    const particles3 = object.add.particles(width + 5, height + 5, 'orangeparticle', {
        speed: { min: 500, max: 200 },
        lifespan: 500,
        quantity: 4,
        gravityY: 30,
        scale: { start: 0.1, end: 0.1 },
        blendMode: 'ADD',
        angle: { min: 180, max: 270 },
    });

    const particles4 = object.add.particles(width + 5, height + 5, 'redparticle', {
        speed: { min: 500, max: 200 },
        lifespan: 550,
        quantity: 4,
        gravityY: 30,
        scale: { start: 0.1, end: 0.2 },
        blendMode: 'ADD',
        angle: { min: 180, max: 270 },
        active: false
    });


    if (finishedAllLevels) {
        const redParticlesMain = object.add.particles(width / 6, height / 6, 'redparticle', {
            speed: { min: 10, max: 200 },
            lifespan: 600,
            quantity: 4,
            gravityY: 30,
            scale: { start: 0.1, end: 0.1 },
            blendMode: 'ADD',
            active: false,
        });

        const greenParticlesMain = object.add.particles(width / 1.2, height / 6, 'greenparticle', {
            speed: { min: 300, max: 200 },
            lifespan: 600,
            quantity: 4,
            gravityY: 30,
            scale: { start: 0.1, end: 0.1 },
            blendMode: 'ADD',
            active: false,
        });

        const redParticlesMain2 = object.add.particles(width / 1.2, height / 6, 'orangeparticle', {
            speed: { min: 300, max: 200 },
            lifespan: 600,
            quantity: 6,
            gravityY: 30,
            scale: { start: 0.1, end: 0.2 },
            blendMode: 'ADD',
            active: false,
        });

        object.time.addEvent({ delay: 500, callback: () => greenParticlesMain.active = true })
        object.time.addEvent({ delay: 1000, callback: () => redParticlesMain2.active = true })
        object.time.addEvent({ delay: 200, callback: () => redParticlesMain.active = true })
    }



    object.time.addEvent({ delay: 500, callback: () => particles2.active = true })
    object.time.addEvent({ delay: 1000, callback: () => particles4.active = true })
}

function createText(object, x, y, text, fontSize, fillColor, stroke, strokeThickness) {
    object.add.text(x, y, text, { fontSize: fontSize, fill: fillColor, stroke: stroke, strokeThickness: strokeThickness }).setOrigin(0.5, 0);
}

function getFinishScoreMessage(data) {
    return messages.finish_score.replace("{0}", data.score).replace("{1}", data.maxScore);
}

function getFinishFailsMessage(data) {
    const failAmount = data.fails;

    if(failAmount === 1) return messages.finish_fail.replace("{0}", data.fails);

    return messages.finish_fails.replace("{0}", data.fails);
}
