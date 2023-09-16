import React from 'react';
import logo from './logo.svg';
import './App.css';
import Weeks from './pages/Weeks';

class App extends React.Component 
{
  constructor(props) {
    super(props);
    this.state = { data: null };
  }

  componentDidMount()
  {
    fetch('https://us-south1-westbury-pickem.cloudfunctions.net/get-data')
       .then((response) => response.json())
       .then((d) => {
          this.setState((state) => ({ data: d }));
       })
       .catch((err) => {
          console.error(err.message);
       });
   }

  render() {  
        return (
          !this.state.data 
            ? <>Loading...</>
            : <><Weeks data={this.state.data} /></>
        )
  }
}

export default App;