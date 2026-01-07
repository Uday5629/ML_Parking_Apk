import React, { useEffect, useState } from 'react';
import { getLevels } from '../api/parkingLotService';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { Link } from 'react-router-dom';

export default function LevelsPage() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getLevels()
      .then((res) => setLevels(res.data || []))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <h2>Parking Levels</h2>
      <Loading />
      {loading ? <Loading /> : null}
      <ErrorMessage error={error} />
      <ul>
        {levels.map((lvl) => (
          <li key={lvl.id || lvl.levelId}>
            <strong>{lvl.name || `Level ${lvl.id || lvl.levelId}`}</strong>
            {' '}
            <Link to={`/levels/${encodeURIComponent(lvl.id || lvl.levelId)}/spots`}>View Spots</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

