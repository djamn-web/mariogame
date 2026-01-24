export class Util {
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secondsPart = seconds % 60;

        const secondsPartStr = secondsPart.toString().padStart(2, '0');
        const minutesStr = minutes.toString().padStart(2, '0');

        return `${minutesStr}:${secondsPartStr}`;
    }
}

