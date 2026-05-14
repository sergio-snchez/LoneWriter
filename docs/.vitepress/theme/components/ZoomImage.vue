<template>
  <div class="zoom-image-container">
    <img 
      :src="src" 
      :alt="alt" 
      class="zoom-image" 
      @click="openLightbox"
      :title="alt || 'Click to enlarge'"
    >
    <p v-if="caption" class="image-caption">{{ caption }}</p>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isLightboxOpen" class="lightbox-overlay" @click="closeLightbox">
          <div class="lightbox-content">
            <img :src="src" class="lightbox-image">
            <div v-if="alt" class="lightbox-caption">{{ alt }}</div>
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
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  caption: {
    type: String,
    default: ''
  }
})

const isLightboxOpen = ref(false)

const openLightbox = () => {
  isLightboxOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  isLightboxOpen.value = false
  document.body.style.overflow = ''
}
</script>

<style scoped>
.zoom-image-container {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.zoom-image {
  max-width: 100%;
  border-radius: 12px;
  cursor: zoom-in;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
}

.zoom-image:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.image-caption {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  font-style: italic;
  text-align: center;
}

/* Lightbox styles */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  cursor: zoom-out;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.lightbox-caption {
  margin-top: 1rem;
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 20px;
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
  .close-btn {
    top: -50px;
    right: 0;
  }
  .lightbox-image {
    max-height: 75vh;
  }
}
</style>
