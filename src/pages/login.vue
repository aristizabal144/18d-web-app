<script setup lang="ts">
import { useRouter } from 'vue-router'
import { themeConfig } from '@themeConfig'
import { supabase } from '@/utils/supabase'

import logoDorado from '@images/logos/logo-dorado.png'
import { useConfigStore } from '@/@core/stores/config'

definePage({
  meta: {
    layout: 'blank',
    public: true,
  },
})

const form = ref({
  email: '',
  password: '',
  remember: false,
})

const isPasswordVisible = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const configStore = useConfigStore()
const router = useRouter()

const currentLogo = computed(() => {
  return logoDorado
})

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.value.email,
      password: form.value.password,
    })

    if (error)
      throw error

    // Login successful, redirect to dashboard or intended route
    router.push('/')
  }
  catch (error: any) {
    let msg = error.message

    // Traducir errores comunes de Supabase al español
    if (msg.includes('Invalid login credentials'))
      msg = 'Correo electrónico o contraseña incorrectos.'
    else if (msg.includes('Email not confirmed'))
      msg = 'Debes confirmar tu correo electrónico antes de iniciar sesión.'
    else if (msg.includes('User not found'))
      msg = 'Usuario no encontrado.'

    errorMessage.value = msg || 'Error al iniciar sesión. Verifica tus credenciales.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <VCard
      class="auth-card-18d pa-0 mx-auto"
      max-width="1200"
      elevation="24"
    >
      <VRow no-gutters>
        <!-- Left Side: Branding / Showcase -->
        <VCol
          md="6"
          class="d-none d-md-flex auth-brand-side align-center justify-center"
        >
          <div class="brand-overlay" />
          <div class="brand-content text-center z-index-1">
            <img
              :src="logoDorado"
              style="width: 100%; max-width: 600px;"
              class="mx-auto brand-logo-glow"
              alt="18D Joyeros Logo"
            >
          </div>
        </VCol>

        <!-- Right Side: Login Form -->
        <VCol
          cols="12"
          md="6"
          class="auth-form-side d-flex align-center justify-center pa-8 pa-sm-12"
        >
          <div
            class="w-100"
            style="max-width: 420px;"
          >
            <div class="text-center mb-8 d-md-none">
              <VImg
                :src="currentLogo"
                max-width="180"
                class="mx-auto mb-4"
              />
            </div>

            <div class="mb-8">
              <h4
                class="text-h4 mb-2 font-weight-bold"
                style="color: rgb(var(--v-theme-on-surface));"
              >
                Bienvenido a <span class="text-primary">18D</span>
              </h4>
              <p
                class="text-body-1 mb-0"
                style="color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));"
              >
                Inicia sesión en tu cuenta para continuar
              </p>
            </div>

            <VForm @submit.prevent="handleLogin">
              <VRow>
                <!-- email -->
                <VCol cols="12">
                  <AppTextField
                    v-model="form.email"
                    autofocus
                    label="Correo electrónico o Usuario"
                    type="email"
                    placeholder="usuario@18djoyeros.com"
                  />
                </VCol>

                <!-- password -->
                <VCol cols="12">
                  <AppTextField
                    v-model="form.password"
                    label="Contraseña"
                    placeholder="············"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    autocomplete="password"
                    :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                    @click:append-inner="isPasswordVisible = !isPasswordVisible"
                  />

                  <div class="d-flex align-center flex-wrap justify-space-between my-6">
                    <VCheckbox
                      v-model="form.remember"
                      label="Recordarme"
                    />
                    <a
                      class="text-primary font-weight-medium"
                      href="javascript:void(0)"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>

                  <VAlert
                    v-if="errorMessage"
                    type="error"
                    variant="tonal"
                    class="mb-4 text-body-2"
                  >
                    {{ errorMessage }}
                  </VAlert>

                  <VBtn
                    block
                    type="submit"
                    size="large"
                    class="login-btn mt-2"
                    :loading="isLoading"
                  >
                    Iniciar Sesión
                  </VBtn>
                </VCol>
              </VRow>
            </VForm>
          </div>
        </VCol>
      </VRow>
    </VCard>
  </div>
</template>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');

.auth-wrapper {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
  background-image: radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.05), transparent 40%),
                    radial-gradient(circle at bottom left, rgba(var(--v-theme-primary), 0.05), transparent 40%);
}

.auth-card-18d {
  overflow: hidden;
  border-radius: 16px !important;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-primary), 0.1) !important;
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3) !important;
}

.auth-brand-side {
  position: relative;
  background-color: #0A0A0A;
  min-height: 600px;
  overflow: hidden;

  // Fondo sutil con un patrón o textura oscura
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, #1E1B16 0%, #0A0A0A 100%);
    opacity: 0.8;
  }
}

.brand-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.05) 0%, transparent 50%, rgba(201, 168, 76, 0.05) 100%);
  pointer-events: none;
}

.brand-logo-glow {
  filter: drop-shadow(0 0 25px rgba(201, 168, 76, 0.25));
  transition: filter 0.5s ease;

  &:hover {
    filter: drop-shadow(0 0 35px rgba(201, 168, 76, 0.4));
  }
}

.login-btn {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1)) 100%) !important;
  color: #141414 !important; // Texto oscuro sobre botón dorado
  font-weight: 600 !important;
  letter-spacing: 0.5px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.4) !important;
  }
}

.z-index-1 {
  z-index: 1;
}
</style>
