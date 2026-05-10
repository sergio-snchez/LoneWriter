<template>
  <div class="step-carousel">
    <div class="carousel-container">
      <div 
        class="carousel-track" 
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div v-for="(slide, index) in slides" :key="index" class="carousel-slide" @click="openLightbox(slide.src)">
          <img :src="slide.src" :alt="slide.label" class="slide-image">
          <div class="slide-overlay">
             <span class="slide-number">{{ index + 1 }} / {{ slides.length }}</span>
             <p class="slide-label">{{ slide.label }}</p>
          </div>
        </div>
      </div>

      <button @click.stop="prev" class="nav-btn prev" :disabled="currentIndex === 0">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button @click.stop="next" class="nav-btn next" :disabled="currentIndex === slides.length - 1">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
    
    <div class="carousel-dots">
      <span 
        v-for="(_, index) in slides" 
        :key="index" 
        class="dot" 
        :class="{ active: currentIndex === index }"
        @click="goTo(index)"
      ></span>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="lightboxImage" class="lightbox-overlay" @click="closeLightbox">
          <div class="lightbox-content">
            <img :src="lightboxImage" class="lightbox-image">
            <button class="close-btn" @click="closeLightbox">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  slides: {
    type: Array,
    required: true
  }
})

const currentIndex = ref(0)
const lightboxImage = ref(null)

const next = () => {
  if (currentIndex.value < props.slides.length - 1) {
    currentIndex.value++
  }
}

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const goTo = (index) => {
  currentIndex.value = index
}

const openLightbox = (src) => {
  lightboxImage.value = src
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxImage.value = null
  document.body.style.overflow = ''
}
</script>

<style scoped>
.step-carousel {
  margin: 2rem 0;
  width: 100%;
}

.carousel-container {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  aspect-ratio: 16 / 9;
}

.carousel-track {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
}

.carousel-slide {
  flex: 0 0 100%;
  position: relative;
  height: 100%;
  cursor: zoom-in;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slide-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  color: white;
}

.slide-number {
  font-size: 0.8rem;
  opacity: 0.8;
  display: block;
  margin-bottom: 0.25rem;
  font-family: var(--vp-font-family-mono);
}

.slide-label {
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.nav-btn:hover:not(:disabled) {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  transform: translateY(-50%) scale(1.1);
}

.nav-btn:disabled {
  opacity: 0;
  cursor: default;
  pointer-events: none;
}

.nav-btn.prev { left: 1rem; }
.nav-btn.next { right: 1rem; }

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-border);
  cursor: pointer;
  transition: all 0.3s;
}

.dot:hover {
  background: var(--vp-c-text-2);
}

.dot.active {
  background: var(--vp-c-brand);
  transform: scale(1.3);
}

/* Lightbox styles */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  cursor: zoom-out;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.close-btn {
  position: absolute;
  top: -40px;
  right: -40px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .carousel-container {
    aspect-ratio: 4 / 3;
  }
  .slide-label {
    font-size: 0.9rem;
  }
  .nav-btn {
    width: 36px;
    height: 36px;
  }
  .close-btn {
    top: -50px;
    right: 0;
  }
}
</style>
