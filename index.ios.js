/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TextInput,
  Dimensions,
  ScrollView,
  Button,
  SectionList,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
window.navigator.userAgent = 'react-native';
import io from 'socket.io-client';
import axios from 'axios';

const { width, height} = Dimensions.get('window');
const SCREEN_HEIGHT = height;
const SCREEN_WIDTH = width;
const ASPECT_RATIO = width / height;

const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA =  LATITUDE_DELTA * ASPECT_RATIO;

const mapsAPIKey = 'AIzaSyBQFJLjTclT6nPe7oVN61kpf7gLjt5jOp4';

const DirectionsRequest = {
  origin: { Lat: 41.8781, Lng: 87.6298 },
  destination: 'Los Angeles, CA',
  //{ Lat: 43.8781, Lng: 89.6298 },
  travelMode: 'WALKING'
}


export default class stackathon2 extends Component {

  constructor(props) {
    super(props);
    this.state = {
      initialPosition: {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0,
      },
      markerPosition: {
        latitude: 0,
        longitude: 0,
      },
      destinationPosition: {
        latitude: 0,
        longitude: 0,
      },
      middlePlaces: [],
      destination: '',
      directions: []
    }
    this.socket = io('http://172.28.118.51:3001', { jsonp: false });
    this.handleGo = this.handleGo.bind(this);
  }

  watchId: ?number = null;

  handleGo() {
    this.setState({ directions: [] });
    navigator.geolocation.getCurrentPosition(position => {
      const lat = parseFloat(position.coords.latitude);
      const lng = parseFloat(position.coords.longitude);

      const initialRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
      const getString = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${this.state.destination}&key=AIzaSyBQFJLjTclT6nPe7oVN61kpf7gLjt5jOp4`;
      console.log('getString is', getString);
      const destinationLocation = {lat: 40.73061, lng: -73.93524};

      axios.get(getString)
       .then(res => res.data)
       .then(directions => {
         console.log('directions are', directions)
         const steps = directions.routes[0].legs[0].steps;
         console.log('steps are', steps);
         const lastStep = steps[steps.length - 1];
         console.log('lastStep is', lastStep);

         const destinationPosition = {
          latitude: lastStep.end_location.lat,
          longitude: lastStep.end_location.lng,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }
         this.setState({destinationPosition});
         steps.forEach(step => console.log('duration is', step.duration.value))
         const totalTime = steps.reduce((acc, step) => { return acc + step.duration.value }, 0)
         console.log('total time is', totalTime);
         let middleStep = -1;
         let middleTime = 0;
         while (middleTime < totalTime / 2) {
           middleStep++;
           middleTime += steps[middleStep].duration.value;
         }
         middleTime -= steps[middleStep].duration.value;

         const onNextStep = (totalTime / 2) - middleTime;
         const percentageOfNextStep = onNextStep / steps[middleStep].duration.value;
         console.log('middleStep duration is', steps[middleStep].duration.value)
         console.log('onNextStep is', onNextStep, 'percentageOfNextStep is', percentageOfNextStep);
         console.log('middleTime is', middleTime);
         console.log('middleStep is', middleStep);
         const newLocation = {};
         // return [lat1 + (lat2 - lat1) * per, long1 + (long2 - long1) * per];
         const lat1 = steps[middleStep].start_location.lat;
         const lat2 = steps[middleStep].end_location.lat;
         const lng1 = steps[middleStep].start_location.lng;
         const lng2 = steps[middleStep].end_location.lng;
         newLocation.lat = lat1 + (lat2 - lat1) * percentageOfNextStep;
         newLocation.lng = lng1 + (lng2 - lng1) * percentageOfNextStep;
        //  newLocation.lat = (steps[middleStep].start_location.lat + steps[middleStep].end_location.lat) / 2;
        //  newLocation.lng = (steps[middleStep].start_location.lng + steps[middleStep].end_location.lng) / 2;
        //  newLocation.lat = steps[middleStep].end_location.lat;
        //  newLocation.lng = steps[middleStep].end_location.lng;

         this.setState({ directions: directions.routes[0].legs[0].steps })
         console.log('newLocation is', newLocation);
         return newLocation;
       })
       .then(newLocation => {
         axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${newLocation.lat},${newLocation.lng}&radius=250&type=restaurant&key=AIzaSyBQFJLjTclT6nPe7oVN61kpf7gLjt5jOp4`)
         .then(res => res.data)
         .then(places => {
           console.log(places)
           if (places.results.length) {
             this.setState({ middlePlaces: places.results });
           }
         })
         .catch(console.error);
       })
       .catch(console.error);
      this.socket.emit('sendLocation', { lat, lng });
      this.setState({ initialPosition: initialRegion, markerPosition: initialRegion })
   }, error => alert(JSON.stringify(error)),
   { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 });

   this.watchId = navigator.geolocation.watchPosition(position => {
     const lat = parseFloat(position.coords.latitude);
     const lng = parseFloat(position.coords.longitude);

     const lastRegion = {
       latitude: lat,
       longitude: lng,
       latitudeDelta: LATITUDE_DELTA,
       longitudeDelta: LONGITUDE_DELTA,
     }

     this.setState({ initialPosition: lastRegion, markerPosition: lastRegion })
      this.refs.map.fitToElements(true, { animated: true });

   })
  }

  componentDidMount() {
    console.log('component mounted');
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId)
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.containerView}>
          <Button
            style={styles.button}
            onPress={this.handleGo}
            title="Find Your MiddlePlace!"
            color="#aaaaaa"
            accessibilityLabel="Go!"
          />
          <TextInput
            style={styles.textBox}
            value={this.state.destination}
            onChangeText={text => this.setState({ destination: text })}>
          </TextInput>
        </View>
        <MapView
          ref="map"
          loadingEnabled={true}
          // fitToElements={true}
          style={styles.map}
          // region={this.state.initialPosition}
        >
          <MapView.Marker
            coordinate={this.state.markerPosition}>
          </MapView.Marker>
          {
            this.state.middlePlaces.map(middplePlace => <MapView.Marker key={middplePlace.id} coordinate={{latitude: middplePlace.geometry.location.lat, longitude: middplePlace.geometry.location.lng}} title={middplePlace.name}></MapView.Marker>)
          }
          <MapView.Marker
            coordinate={this.state.destinationPosition}>
          </MapView.Marker>

        </MapView>
        </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  containerView: {
    alignSelf: 'stretch',
    // flex: 1,
    // justifyContent: 'space-between',
    // flexDirection: 'column',
  },
  map: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
  },
  button: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    alignSelf: 'stretch',
  },
  textBox: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 50,
    alignSelf: 'stretch',
  }
});

AppRegistry.registerComponent('stackathon2', () => stackathon2);

// <View style={styles.container}>
// <Text style={styles.welcome}>
//   Welcome to React Native!
// </Text>
// <Text style={styles.instructions}>
//   To get started, edit index.ios.js
// </Text>
// <Text style={styles.instructions}>
//   Press Cmd+R to reload,{'\n'}
//   Cmd+D or shake for dev menu
//   I have edited my index.ios file :)
// </Text>
// </View>

// <MapView
// initialRegion={{
//   latitude: 37.78825,
//   longitude: -122.4324,
//   latitudeDelta: 0.0922,
//   longitudeDelta: 0.0421,
// }}
// />
