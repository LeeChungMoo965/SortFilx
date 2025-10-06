import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import RankedCarousel from '../components/RankedCarousel';
import HeroBanner from '../components/HeroBanner';
import '../components/Filter.css'; // 필터 CSS 불러오기
import './HomePage.css';

// 전체 장르 목록 (무작위 선택을 위해 사용)
const allGenres = [
  '스릴러', '코미디', 'SF', '드라마', '애니메이션',
  '다큐멘터리', '로맨스', '액션', '호러', '판타지'
];

// 한국어 장르를 영어 검색어로 바꿔주기 위한 객체
const genreMap = {
  '스릴러': 'thriller', '코미디': 'comedy', 'SF': 'sci-fi', '드라마': 'drama', 
  '애니메이션': 'animation', '다큐멘터리': 'documentary', '로맨스': 'romance', 
  '액션': 'action', '호러': 'horror', '판타지': 'fantasy'
};

// 필터 버튼 옵션
const durations = [
    { label: '전체', value: 'any' },
    { label: '4분 미만', value: 'short' },
    { label: '4-20분', value: 'medium' },
    { label: '20분 이상', value: 'long' },
];

function ResultPage() {
  const location = useLocation();
  const selectedGenres = location.state?.genres || [];
  
  // 영상 길이 필터를 위한 state (기본값 'any')
  const [durationFilter, setDurationFilter] = useState('any');
  
  const [selectedGenreVideos, setSelectedGenreVideos] = useState([]);
  const [randomGenre, setRandomGenre] = useState(''); // 무작위 추천 state 복원
  const [randomGenreVideos, setRandomGenreVideos] = useState([]); // 무작위 추천 state 복원
  const [watchedList, setWatchedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect의 의존성 배열에 durationFilter 추가
  useEffect(() => {
    setLoading(true); // 필터 변경 시 로딩 상태 활성화
    const watchedList = JSON.parse(localStorage.getItem('watchedVideos') || '[]');
    setWatchedList(watchedList);
    
    const fetchAllVideos = async () => {
        if (selectedGenres.length === 0) {
            setError("선택된 장르가 없습니다.");
            setLoading(false);
            return;
        }
      try {
        // 무작위 장르 선택 로직 복원
        const availableGenres = allGenres.filter(g => !selectedGenres.includes(g));
        const random = availableGenres[Math.floor(Math.random() * availableGenres.length)] || allGenres[0];
        setRandomGenre(random);

        // 각 장르에 대한 영어 검색어 생성
        const selectedEnglishGenres = selectedGenres.map(g => genreMap[g] || g);
        const randomEnglishGenre = genreMap[random] || random;
        
        let selectedSearchQuery = `${selectedEnglishGenres.join(' ')} short film`;
        let randomSearchQuery = `${randomEnglishGenre} short film`;
        
        // 쇼츠를 제외하기 위한 검색어 수정
        if (durationFilter === 'any' || durationFilter === 'short') {
            selectedSearchQuery += ' -shorts';
            randomSearchQuery += ' -shorts';
        }

        const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

        // API 호출을 다시 2개로 복원
        const [selectedRes, randomRes] = await Promise.all([
          fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(selectedSearchQuery)}&type=video&maxResults=15&sortOrder=viewCount&videoDuration=${durationFilter}&key=${YOUTUBE_API_KEY}`),
          fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(randomSearchQuery)}&type=video&maxResults=15&sortOrder=viewCount&videoDuration=${durationFilter}&key=${YOUTUBE_API_KEY}`)
        ]);
        
        if (!selectedRes.ok || !randomRes.ok) throw new Error('YouTube API에서 데이터를 가져오는데 실패했습니다.');
        const selectedData = await selectedRes.json();
        const randomData = await randomRes.json();

        // API 결과에서 시청한 영상을 필터링합니다.
        const filteredSelectedVideos = selectedData.items.filter(
          video => !watchedList.includes(video.id.videoId)
        ).slice(0, 10); // 필터링 후 10개만 선택
        const filteredRandomVideos = randomData.items.filter(
            video => !watchedList.includes(video.id.videoId)
        ).slice(0, 10); // 필터링 후 10개만 선택
        
        setSelectedGenreVideos(filteredSelectedVideos);
        setRandomGenreVideos(filteredRandomVideos); // 무작위 추천 결과 저장
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllVideos();
  }, [location.state, durationFilter]); // durationFilter가 바뀔 때마다 API 재호출

  if (error) return <div className="error-text">⚠️ 이런! 에러가 발생했어요: {error}</div>;

  const heroVideo = selectedGenreVideos.length > 0 ? selectedGenreVideos.filter(v => !watchedList.includes(v.id.videoId))[0] || selectedGenreVideos[0] : null;

  return (
    <div className="homepage-container">
      {!loading && <HeroBanner video={heroVideo} />}
      
      <div className="carousels-wrapper">
        <div className="filter-container">
            <div className="filter-segment">
                {durations.map(d => (
                    <button 
                        key={d.value} 
                        className={`filter-button ${durationFilter === d.value ? 'active' : ''}`}
                        onClick={() => setDurationFilter(d.value)}
                    >
                        {d.label}
                    </button>
                ))}
            </div>
        </div>

        {loading ? (
            <div className="loading-text">🔍 영화 순위를 불러오고 있어요...</div>
        ) : (
            <>
                <RankedCarousel title={`'${selectedGenres.join(', ')}' 장르 TOP 10`} videos={selectedGenreVideos} watchedList={watchedList} />
                
                {/* 무작위 추천 캐러셀 추가 */}
                <RankedCarousel title={`'${randomGenre}' 장르 TOP 10, 이런 건 어떠세요?`} videos={randomGenreVideos} watchedList={watchedList} />
            </>
        )}
      </div>
    </div>
  );
}

export default ResultPage;