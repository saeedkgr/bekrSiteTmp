<script setup lang="ts">
import type { NuxtError } from '#app'
import { fa_ir } from '@nuxt/ui/locale'
defineProps<{ error: NuxtError }>()
useHead({ title: 'برگه پیدا نشد – شرکت بکرپردازان دنیای مجازی' })
</script>

<template>
  <UApp :locale="fa_ir">
    <NuxtLayout>
      <div id="primary">
        <div id="content">
          <section class="no-results not-found">
            <h2 class="entry-title">
              {{ error.statusCode === 404 ? 'برگه پیدا نشد' : error.statusMessage }}
            </h2>
            <p class="mt-4 text-center">
              <UButton to="/" color="primary">صفحه اصلی</UButton>
            </p>
          </section>
        </div>
      </div>
    </NuxtLayout>
  </UApp>
</template>
