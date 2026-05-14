import DefaultTheme from 'vitepress/theme'
import StepCarousel from './components/StepCarousel.vue'
import ZoomImage from './components/ZoomImage.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('StepCarousel', StepCarousel)
    app.component('ZoomImage', ZoomImage)
  }
}
