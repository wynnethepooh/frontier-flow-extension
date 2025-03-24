import React from 'react';

import {Flight} from './types.ts';
import './flight-info.css';

interface FlightInfoProps {
  code: string;
  flight: Flight | null;
}

const FlightInfo: React.FC<FlightInfoProps> = ({ code, flight }) => {
  return (
    <div className="container">
      <div className="details">
        <p className="route">{flight?.route}</p>
        <p className="departure-info">
          <span>{flight?.depart}</span>
          <span>{flight?.arrive}</span>
        </p>
      </div>
      <button key={code} className="frontier-button" disabled={!flight?.link}>
        {flight?.link ? (
          <a href={flight.link} target="_blank">{code}</a>
        ) : (
          code
        )}
      </button>
    </div>
  );
}

export default FlightInfo