<template>
  <div class="wrapper">
    <SiteHeader />
    <!-- #main/#primary/#content keep the original ids so the page content renders with its original styles -->
    <div id="main">
      <div class="container clearfix">
        <slot />
      </div>
    </div>
    <SiteFooter />
  </div>
</template>
