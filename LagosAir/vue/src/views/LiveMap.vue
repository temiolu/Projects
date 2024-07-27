<template>
  <div>
    <h2>Departures</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Flight</th>
          <th>Destination</th>
          <th>Departure Time</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="flight in departures" :key="flight.ident">
          <td>{{ flight.ident }}</td>
          <td>Lagos <font-awesome-icon icon="plane-departure" style="margin-right: 5px;" />{{ flight.destination.city }}</td>
          <td>{{ getLocalTime(flight.scheduled_out) }}</td>
          <td>{{ flight.status }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Arrivals</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Flight</th>
          <th>Origin</th>
          <th>Arrival Time</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="flight in arrivals" :key="flight.ident">
          <td>{{ flight.ident }}</td>
          <td>{{ flight.origin.city }} <font-awesome-icon icon="plane-arrival" style="margin-right: 5px;" /> Lagos</td>
          <td>{{ getLocalTime(flight.scheduled_in) }}</td>
          <td>{{ flight.status }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import axios from 'axios';
import { ref, onMounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPlaneDeparture } from '@fortawesome/free-solid-svg-icons';
import { faPlaneArrival } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
library.add(faPlaneDeparture, faPlaneArrival);

const departures = ref([]);
const arrivals = ref([]);

const GetDepartures = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:5000/departures');
    const flights = res.data.departures;
    departures.value = flights.filter(flight => flight.type === 'Airline' && flight.destination !== null)
    console.log(departures.value)
  } catch (error) {
    console.error('Error fetching departures:', error);
  }
};

const GetArrivals = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:5000/arrivals');
    const flights = res.data.arrivals;
    arrivals.value = flights.filter(flight => flight.type === 'Airline' && flight.origin !== null)
    console.log(arrivals.value)
  } catch (error) {
    console.error('Error fetching arrivals:', error);
  }
};

const getLocalTime = (utcTime) => {
  const date = new Date(utcTime);
  const options = { 
    hour: '2-digit', 
    minute: '2-digit', 
    timeZone: 'Africa/Lagos' 
  };
  return date.toLocaleTimeString([], options);
};

onMounted(() => {
  GetDepartures();
  GetArrivals();
});
</script>
