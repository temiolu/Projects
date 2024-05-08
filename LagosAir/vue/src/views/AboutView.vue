<template>
  <div class="about">
    <h1>This is an about page</h1>
    <button @click="GetAirport()">CLICK ME</button>
  </div>
</template>

<script setup>
import axios from 'axios';

const GetAirport = async () => {
  const res = await axios.get('http://127.0.0.1:5000')
  const air = res.data;
  console.log(air.city); 
};
</script>
