'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// workout class
class Workout {
  date = new Date();
  // use the date and get the last 10 chars
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _workoutDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.desciption = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

// running class
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._workoutDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min / km
    return this.pace;
  }
}

// cycling class
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._workoutDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km / min
    return this.speed;
  }
}

// app class
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // get the current position
    this._getPosition();
    // get the local storage
    this._getLocalStorage();
    // submiting form event
    form.addEventListener('submit', this._newWorkout.bind(this));
    // select event
    inputType.addEventListener('change', this._toggleElevationFiled);
    // set the popup click movement
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // getting the user current position
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Couldn't get your location`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    // adding third party library for loading the map
    this.#map = L.map('map').setView(coords, 5);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // add event to create marks on any position user click
    this.#map.on('click', this._showForm.bind(this));

    // add points to the map after loading
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationFiled() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validateInput = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const validateSign = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if running --> running obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validateInput(distance, duration, cadence) ||
        !validateSign(distance, duration, cadence)
      )
        return alert('Inputs have to be a positive number!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if cycling --> cycling obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validateInput(distance, duration, elevation) ||
        !validateSign(distance, duration)
      )
        return alert('Inputs have to be a positive number!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new obj to workout array
    this.#workouts.push(workout);

    // add workout to the map and list and clear the form
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();

    // set local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.desciption}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.desciption}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    inputCadence.blur();
    inputElevation.blur();
    form.classList.add('hidden');
  }

  _moveToPopup(e) {
    const workoutElement = e.target.closest('.workout');
    if (!workoutElement) return;
    const workout = this.#workouts.find(
      work => work.id === workoutElement.dataset.id
    );
    // set map view
    this.#map.setView(workout.coords, 5, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
