<template>
  <header>
    <nav class="navbar navbar-expand-lg navbar-light bg-body-tertiary container-fluid"
    style="background-color: #008751 !important;">
    <div class="container-fluid">
      <RouterLink to="/"><img alt="Vue logo" class="logo" src="@/assets/Lagosairlogo.png" width="300" height="70" /></RouterLink>
      <div class="collapse navbar-collapse" id="navbarTogglerDemo03">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <RouterLink to="/livemap">Live Map</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/about">About</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/pois">POIs</RouterLink>
          </li>
          <li class="nav-item">
          Time in Lagos: {{ LagosTime }}
          </li>
        </ul>
        <form class="d-flex input-group w-auto">
          <input
            type="text"
            class="form-control"
            placeholder="Search Flights"
            v-model="input"
          />
          <button
            data-mdb-ripple-init
            class="btn btn-outline-primary"
            type="button"
            data-mdb-ripple-color="dark"
          >
            Search
          </button>
        </form>
      </div>
    </div>
  </nav>
  <div class="wrapper">
    <HelloWorld msg="You did it!" />
  </div>
  </header>
  <main class="mainpage">
    <RouterView />
  </main>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { ref, onMounted } from 'vue';

const LagosTime = ref('');

const updateTime = () => {
  const date = new Date();
  const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true,  timeZone: 'Africa/Lagos' });
  LagosTime.value = timeString
};

onMounted(() => {
  updateTime();
  setInterval(updateTime, 1000);
});
</script>
<style scoped>
.wrapper {
  margin-top: 2rem;
}
</style>
