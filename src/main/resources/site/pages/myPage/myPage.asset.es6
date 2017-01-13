export default class MyPage {
    static init() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('MyPage: document DOMContentLoaded');
        });
        window.addEventListener('load', () => {
            console.log('MyPage: window load');
        });
    }
}
