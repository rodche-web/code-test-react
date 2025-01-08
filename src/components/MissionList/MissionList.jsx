import { useState, useEffect, useRef, useCallback } from 'react';
import './styles.scss';

function calculateTimeAgo(dateString) {
    const pastDate = new Date(dateString);
    const currentDate = new Date();

    let yearsDiff = currentDate.getFullYear() - pastDate.getFullYear();
    let monthsDiff = currentDate.getMonth() - pastDate.getMonth();

    if (monthsDiff < 0) {
        yearsDiff--;
        monthsDiff += 12;
    }

    if (currentDate.getDate() < pastDate.getDate()) {
        monthsDiff--;
        if (monthsDiff < 0) {
            yearsDiff--;
            monthsDiff += 12;
        }
    }

    if (yearsDiff > 0) {
        return `${yearsDiff} year${yearsDiff > 1 ? 's' : ''} and ${monthsDiff} month${monthsDiff > 1 ? 's' : ''} ago`;
    } else {
        return `${monthsDiff} month${monthsDiff > 1 ? 's' : ''} ago`;
    }
}

const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

const MissionCard = ({ mission }) => {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = calculateTimeAgo(mission.launch_date_utc);

  if (expanded) {
    return (
      <div className="mission-card">
        <div className="mission-card__content">
          <div className="mission-card__info">
            <span className="mission-card__title">{mission.mission_name}</span>
            <span className="mission-card__status mission-card__status--failed">
              {mission.upcoming ? 'upcoming' : mission.launch_success ? 'success' : 'failure'}
            </span>
          </div>
        </div>
        
        <div className="mission-card__details">
          <div className="mission-card__meta">
            {timeAgo} | <a href={mission.links.article_link}>Article</a> | <a href={mission.links.video_link}>Video</a>
          </div>
          <p className="mission-card__description">{mission.details}</p>
          <button 
            className="mission-card__button"
            onClick={() => setExpanded(false)}
          >
            HIDE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mission-card">
      <div className="mission-card__content">
        <div className="mission-card__info">
          <span className="mission-card__title">{mission.mission_name}</span>
          <span className="mission-card__status">{mission.upcoming ? 'upcoming' : mission.launch_success ? 'success' : 'failure'}</span>
        </div>
        <button 
          className="mission-card__button"
          onClick={() => setExpanded(true)}
        >
          VIEW
        </button>
      </div>
    </div>
  );
};

const MissionList = () => {
  const [missions, setMissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loaderRef = useRef(null);

  const fetchMissions = async (query = '', limit = 10, offset = 0) => {
    let APIUrl = `https://api.spacexdata.com/v3/launches?limit=${limit}&offset=${offset}`
    if (query) {
        const formattedQuery = query.replace(/\s+/g, '+')
        APIUrl = `https://api.spacexdata.com/v3/launches?mission_name=${formattedQuery}`
    }
    const resp = await fetch(APIUrl);
    const data = await resp.json();
    return data;
  }
  
  const loadMoreMissions = async () => {
    setLoading(true);
    const offset = page * 10;
    const newMissions = await fetchMissions(null, 10, offset);
      
    if (newMissions.length > 0) {
        setMissions(prev => [...prev, ...newMissions]);
        setPage(prev => prev + 1);
    } else {
        setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !searchQuery) {
          loadMoreMissions();
        }
      },
      { threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loading]);

  const fetchData = async (query) => {
    if (query) {
      setLoading(true);
      try {
        const data = await fetchMissions(query);
        setMissions(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setMissions([]);
    }
  };
  const debouncedFetchData = useCallback(debounce(fetchData, 1000), []);

  useEffect(() => {
    debouncedFetchData(searchQuery);
  }, [searchQuery, debouncedFetchData]);

  const handleInputChange = async event => {
    setSearchQuery(event.target.value);
  };

  return (
    <div className="app">
      <div className="app__container">
        <div className="search__container">
          <input
            type="search"
            placeholder="Search..."
            className="search__input"
            value={searchQuery}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="missions-list">
          {missions.map((mission, index) => (
            <MissionCard key={mission.mission_name} mission={mission} />
          ))}
          
          {hasMore && (
            <div ref={loaderRef} className="loader">
              {loading ? "Loading..." : ""}
            </div>
          )}
          
          {!hasMore && (
            <div className="end-message">
              End of list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionList;