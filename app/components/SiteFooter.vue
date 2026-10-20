<script setup lang="ts">
const { data: site } = await useSite()
const footer = computed(() => site.value?.footer)

const showTop = ref(false)
const onScroll = () => { showTop.value = window.scrollY > 100 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
</script>

<template>
  <footer class="bg-white bg-[url('/wp-content/uploads/2020/07/page-header-box-03.png')] text-[#888]">
    <div class="ms-[10%] me-[5%] flex pt-[25px] pb-6 max-md:mx-4 max-md:flex-col max-md:gap-6">
      <!-- Latest tech posts -->
      <div class="basis-[30.4%] md:me-[2.97%]">
        <h2 class="pb-[15px] text-[20px] leading-none font-bold text-[#333]">تازه های فناوری</h2>
        <hr class="w-[70%] border-t border-mint shadow-[0_0_3px_0_#63c6ae]">
        <ul class="-mx-[15px] mt-[15px]">
          <li v-for="post in footer?.techPosts" :key="post.to" class="flex items-start px-[15px] pb-[5px]">
            <NuxtLink :to="post.to" class="shrink-0">
              <img v-if="post.image" :src="post.image" :alt="post.title" width="40" height="40" class="me-[5px] size-10 rounded-[5px]">
            </NuxtLink>
            <h5 class="mt-0.5">
              <NuxtLink :to="post.to" class="text-[16px] leading-[17.6px] text-[#333] hover:text-mint">{{ post.title }}</NuxtLink>
            </h5>
          </li>
        </ul>
      </div>

      <!-- Contact -->
      <div class="basis-[30.4%] text-[17px] leading-[25px] text-[#333] md:me-[2.97%]">
        <h2 class="pb-[15px] text-[20px] leading-none font-bold">تماس با ما</h2>
        <hr class="w-[70%] border-t border-mint shadow-[0_0_3px_0_#63c6ae]">
        <div class="w-3/4">
          <div class="mt-2.5 before:align-middle before:text-[30px] before:text-jade before:content-['🗺']">
            <NuxtLink to="/contact-us/" class="text-[16px] text-[#333] hover:text-mint">{{ footer?.address }}</NuxtLink>
          </div>
          <div class="mt-2.5 before:align-middle before:text-[30px] before:text-jade before:content-['✉']">
            <a :href="`mailto:${footer?.email}`" title=" Mail Us " class="text-[#333] hover:text-mint">{{ footer?.email }}</a>
          </div>
          <div class="mt-2.5 before:align-middle before:text-[30px] before:text-jade before:content-['☏']">
            {{ footer?.phone }}
          </div>
        </div>
      </div>

      <!-- Social networks -->
      <div class="basis-[30.4%]">
        <h2 class="pb-[15px] text-[20px] leading-none font-bold text-[#333]">شبکه های اجتماعی</h2>
        <hr class="w-[70%] border-t border-mint shadow-[0_0_3px_0_#63c6ae]">
        <div class="flex">
          <a v-for="s in footer?.socials" :key="s.href" :href="s.href" target="_blank" rel="noopener">
            <img :src="s.icon" alt="" width="28" height="28" class="mt-2.5 mb-5 ms-2.5 size-7 rounded-[20px]">
          </a>
        </div>
      </div>
    </div>

    <UButton
      v-show="showTop"
      class="fixed right-5 bottom-5 z-50 size-10 justify-center rounded-[3px] bg-[#555] text-[30px] leading-10 text-white hover:bg-mint"
      aria-label="بازگشت به بالا"
      @click="toTop"
    >
      ↥
    </UButton>
  </footer>
</template>
