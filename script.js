/**
 * ==========================================================================
 * 프로젝트: 세계적 상품 교역 - 인도양 무역 시뮬레이션
 * 파일명: script.js
 * 설명: 고등학교 세계사 수업용 무역 시뮬레이션 게임 로직
 * 특징:
 *   - 설정 영역(GAME_CONFIG)을 별도로 분리하여 교사가 쉽게 수치 조정 가능
 *   - 3라운드 점진적 기능 해금 (1R: 지역 내 교역 -> 2R: 직접 이동 -> 3R: 중계무역)
 *   - 날짜 기반 시간 시스템 (행동별 1~4일 소요, 하루 5냥 고정 운영비 자동 차감)
 *   - 직교역 vs 중계무역 전격 비교 분석기 제공
 *   - 지도 경로를 따라 움직이는 애니메이션 (⛵ 해상, 🐪 육상)
 *   - 학습지 및 NotebookLM 연계용 결과 텍스트 원클릭 복사
 * ==========================================================================
 */

// ==========================================================================
// [교사용 게임 설정 영역 - 필요시 자유롭게 수정 가능]
// ==========================================================================
const GAME_CONFIG = {
  // 1. 초기 시작 조건
  STARTING_CASH: 500,               // 시작 자금 (냥)
  STARTING_REGION: 'india',         // 시작 거점 ('india', 'china', 'southeast_asia', 'arabia', 'east_africa')
  STARTING_INVENTORY: {
    cotton: 3                       // 초기 보유 상품: 면직물 3개
  },

  // 2. 경제 및 시간 규칙
  DAILY_LIVING_COST: 5,             // 하루 고정 운영비 (식비·숙박·인건비, 냥/일)
  MIDDLEMAN_COMMISSION_RATE: 0.35,  // 중계무역 수수료 비율 (35%)

  // 3. 라운드별 활동 기간 (일수)
  ROUND_DAYS: {
    1: 4,                           // 1라운드: 4일 (누적 1~4일차)
    2: 8,                           // 2라운드: 8일 (누적 5~12일차)
    3: 8                            // 3라운드: 8일 (누적 13~20일차) - 총 20일
  },

  // 4. 주요 교역 거점 5곳
  HUBS: {
    china: {
      id: 'china',
      name: '중국 (광저우·천주)',
      shortName: '중국',
      flag: '🇨🇳',
      x: 840,
      y: 170,
      desc: '비단과 도자기의 종주국이자 동아시아 해상 무역의 출발점',
      primaryGoods: ['silk', 'porcelain']
    },
    southeast_asia: {
      id: 'southeast_asia',
      name: '동남아시아 (말라카)',
      shortName: '동남아시아',
      flag: '🏝️',
      x: 740,
      y: 350,
      desc: '몰루카 제도의 귀한 정향·육두구와 인도양을 잇는 해상 교역의 요충지',
      primaryGoods: ['spices']
    },
    india: {
      id: 'india',
      name: '인도 (캘리컷)',
      shortName: '인도',
      flag: '🇮🇳',
      x: 540,
      y: 300,
      desc: '우수한 품질의 면직물 생산지이자 동서양 상인들이 교차하는 인도양의 중심',
      primaryGoods: ['cotton']
    },
    arabia: {
      id: 'arabia',
      name: '아라비아 (호르무즈·아덴)',
      shortName: '아라비아',
      flag: '🕌',
      x: 320,
      y: 250,
      desc: '사막의 보물 유향과 직물을 취급하며 육상과 해상을 연결하는 이슬람 상인의 거점',
      primaryGoods: ['frankincense', 'fabrics']
    },
    east_africa: {
      id: 'east_africa',
      name: '동아프리카 (킬와·모가디슈)',
      shortName: '동아프리카',
      flag: '🌍',
      x: 230,
      y: 430,
      desc: '내륙에서 채취한 풍부한 황금과 상아를 수출하는 스와힐리 무역 도시',
      primaryGoods: ['gold', 'ivory']
    }
  },

  // 5. 대표 거래 상품 정의 및 지역별 가격표 (가상의 교육용 수치)
  GOODS: {
    silk: {
      id: 'silk',
      name: '비단',
      icon: '🧣',
      origin: 'china',
      originName: '중국 특산',
      desc: '중국의 직조 기술로 만든 부드럽고 화려한 최고급 직물',
      // 지역별 구매가(buy)와 판매가(sell)
      prices: {
        china:          { buy: 40,  sell: 35 },
        southeast_asia: { buy: 70,  sell: 65 },
        india:          { buy: 85,  sell: 78 },
        arabia:         { buy: 110, sell: 100 },
        east_africa:    { buy: 125, sell: 115 }
      }
    },
    porcelain: {
      id: 'porcelain',
      name: '도자기',
      icon: '🏺',
      origin: 'china',
      originName: '중국 특산',
      desc: '청화백자 등 세계인들의 찬사를 받은 가볍고 견고한 명품 그릇',
      prices: {
        china:          { buy: 30, sell: 26 },
        southeast_asia: { buy: 55, sell: 50 },
        india:          { buy: 68, sell: 62 },
        arabia:         { buy: 85, sell: 78 },
        east_africa:    { buy: 95, sell: 88 }
      }
    },
    spices: {
      id: 'spices',
      name: '향신료 (정향·후추)',
      icon: '🌿',
      origin: 'southeast_asia',
      originName: '동남아시아 특산',
      desc: '음식의 풍미를 돋우고 방부 효과가 뛰어난 열대 향신료',
      prices: {
        southeast_asia: { buy: 25, sell: 20 },
        china:          { buy: 55, sell: 50 },
        india:          { buy: 48, sell: 42 },
        arabia:         { buy: 75, sell: 70 },
        east_africa:    { buy: 85, sell: 78 }
      }
    },
    cotton: {
      id: 'cotton',
      name: '면직물',
      icon: '🧵',
      origin: 'india',
      originName: '인도 특산',
      desc: '통기성과 염색성이 뛰어나 전 인도양에서 사랑받은 실용적 직물',
      prices: {
        india:          { buy: 20, sell: 16 },
        southeast_asia: { buy: 38, sell: 34 },
        china:          { buy: 48, sell: 42 },
        arabia:         { buy: 42, sell: 38 },
        east_africa:    { buy: 48, sell: 42 }
      }
    },
    frankincense: {
      id: 'frankincense',
      name: '향료 (유향)',
      icon: '🪔',
      origin: 'arabia',
      originName: '아라비아 특산',
      desc: '종교 의식과 치료약으로 귀하게 쓰인 아라비아 사막의 향기로운 나무 진액',
      prices: {
        arabia:         { buy: 30, sell: 25 },
        india:          { buy: 58, sell: 52 },
        southeast_asia: { buy: 70, sell: 64 },
        china:          { buy: 85, sell: 80 },
        east_africa:    { buy: 55, sell: 50 }
      }
    },
    fabrics: {
      id: 'fabrics',
      name: '모직물·직물',
      icon: '🧶',
      origin: 'arabia',
      originName: '아라비아 특산',
      desc: '서아시아 장인들이 양모를 짜서 만든 고급 모직물과 카펫',
      prices: {
        arabia:         { buy: 25, sell: 20 },
        india:          { buy: 45, sell: 40 },
        southeast_asia: { buy: 55, sell: 50 },
        china:          { buy: 62, sell: 56 },
        east_africa:    { buy: 50, sell: 45 }
      }
    },
    gold: {
      id: 'gold',
      name: '황금',
      icon: '🪙',
      origin: 'east_africa',
      originName: '동아프리카 특산',
      desc: '아프리카 내륙 짐바브웨 등지에서 채취된 순도 높은 사금과 금괴',
      prices: {
        east_africa:    { buy: 50,  sell: 45 },
        arabia:         { buy: 85,  sell: 80 },
        india:          { buy: 100, sell: 95 },
        southeast_asia: { buy: 110, sell: 105 },
        china:          { buy: 125, sell: 120 }
      }
    },
    ivory: {
      id: 'ivory',
      name: '상아',
      icon: '🦣',
      origin: 'east_africa',
      originName: '동아프리카 특산',
      desc: '아프리카 코끼리의 엄니로 만든 호화로운 조각 예술품 재료',
      prices: {
        east_africa:    { buy: 35, sell: 30 },
        arabia:         { buy: 65, sell: 60 },
        india:          { buy: 75, sell: 70 },
        southeast_asia: { buy: 85, sell: 80 },
        china:          { buy: 98, sell: 92 }
      }
    }
  },

  // 6. 이동 경로 정의 (연결 관계)
  ROUTES: [
    {
      id: 'china-southeast_asia',
      from: 'china',
      to: 'southeast_asia',
      type: 'sea',
      modeIcon: '⛵',
      modeName: '해상 항로',
      routeName: '남중국해 항로 (중국 ↔ 동남아시아)',
      days: 2,
      transportCost: 25,
      svgPathId: 'route-china-southeast_asia',
      desc: '계절풍을 타고 남중국해를 항해하는 주요 해상 무역로'
    },
    {
      id: 'southeast_asia-india',
      from: 'southeast_asia',
      to: 'india',
      type: 'sea',
      modeIcon: '⛵',
      modeName: '해상 항로',
      routeName: '벵골만 항로 (동남아시아 ↔ 인도)',
      days: 2,
      transportCost: 25,
      svgPathId: 'route-southeast_asia-india',
      desc: '말라카 해협을 지나 벵골만을 횡단하여 인도 캘리컷에 닿는 항로'
    },
    {
      id: 'india-arabia',
      from: 'india',
      to: 'arabia',
      type: 'sea',
      modeIcon: '⛵',
      modeName: '해상 항로',
      routeName: '아라비아해 항로 (인도 ↔ 아라비아)',
      days: 2,
      transportCost: 25,
      svgPathId: 'route-india-arabia',
      desc: '여름·겨울 몬순을 이용해 인도양을 왕래하던 다우선(Dhow)들의 바닷길'
    },
    {
      id: 'arabia-east_africa',
      from: 'arabia',
      to: 'east_africa',
      type: 'sea',
      modeIcon: '⛵',
      modeName: '해상 항로',
      routeName: '스와힐리 해안 항로 (아라비아 ↔ 동아프리카)',
      days: 2,
      transportCost: 20,
      svgPathId: 'route-arabia-east_africa',
      desc: '아덴만을 지나 잔지바르, 킬와 등 스와힐리 도시로 이어지는 연안 항로'
    },
    {
      id: 'china-arabia-land',
      from: 'china',
      to: 'arabia',
      type: 'land',
      modeIcon: '🐪',
      modeName: '육상 비단길 (실크로드)',
      routeName: '중앙아시아 경유 비단길 (중국 ↔ 아라비아)',
      days: 4,
      transportCost: 45,
      svgPathId: 'route-china-arabia-land',
      desc: '중앙아시아 오아시스 도시들을 거치는 험준하지만 유서 깊은 사막·초원 교역로'
    }
  ]
};

// ==========================================================================
// [게임 상태 관리 (State)]
// ==========================================================================
let gameState = {
  round: 1,                 // 1, 2, 3
  currentDay: 1,            // 누적 날짜 (1 ~ 20일)
  roundElapsedDays: 0,      // 이번 라운드에서 사용한 일수
  location: GAME_CONFIG.STARTING_REGION,
  funds: GAME_CONFIG.STARTING_CASH,
  inventory: { ...GAME_CONFIG.STARTING_INVENTORY },

  // 통계 및 재정 내역 분리
  stats: {
    totalRevenue: 0,        // 상품 판매 수익 합계
    totalExpenses: 0,       // 총 지출 합계
    expenseGoods: 0,        // 상품 원가 구매비
    expenseTransport: 0,    // 이동 운송비
    expenseLiving: 0,       // 일일 고정 운영비 합계
    expenseCommission: 0,   // 중계무역 수수료 합계
    visitedHubs: new Set([GAME_CONFIG.STARTING_REGION]),
    seaTrips: 0,
    landTrips: 0,
    middlemanOrders: 0,
    logs: []                // 거래 장부 기록
  }
};

// 모달 거래 작업 임시 데이터
let currentTradeContext = {
  mode: 'buy',              // 'buy' | 'sell' | 'middleman'
  itemId: null,
  hubId: null,
  unitPrice: 0,
  maxQuantity: 1
};

// ==========================================================================
// [초기화 및 DOM 로드 이벤트]
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initGame();
  bindEvents();
});

/** 게임 초기화 */
function initGame() {
  resetState();
  renderAll();
  showRoundIntroModal(1);
}

/** 상태 리셋 */
function resetState() {
  gameState = {
    round: 1,
    currentDay: 1,
    roundElapsedDays: 0,
    location: GAME_CONFIG.STARTING_REGION,
    funds: GAME_CONFIG.STARTING_CASH,
    inventory: { ...GAME_CONFIG.STARTING_INVENTORY },
    stats: {
      totalRevenue: 0,
      totalExpenses: 0,
      expenseGoods: 0,
      expenseTransport: 0,
      expenseLiving: 0,
      expenseCommission: 0,
      visitedHubs: new Set([GAME_CONFIG.STARTING_REGION]),
      seaTrips: 0,
      landTrips: 0,
      middlemanOrders: 0,
      logs: []
    }
  };
  logActivity('info', `교역 시작: 인도(캘리컷)에서 시작 자금 500냥과 면직물 3개로 무역을 시작합니다.`, 0);
}

// ==========================================================================
// [이벤트 바인딩]
// ==========================================================================
function bindEvents() {
  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabTarget = e.currentTarget.dataset.tab;
      switchTab(tabTarget);
    });
  });

  // 라운드 시작 모달 버튼
  document.getElementById('btn-start-round').addEventListener('click', () => {
    closeModal('modal-round-intro');
    showToast('info', `${gameState.round}라운드가 시작되었습니다. 활동 기간을 알차게 사용하세요!`);
  });

  // 라운드 종료 모달 -> 다음 라운드 진행 버튼
  document.getElementById('btn-next-round').addEventListener('click', () => {
    closeModal('modal-round-debrief');
    advanceToNextRound();
  });

  // 도움말 열기/닫기
  document.getElementById('btn-show-help').addEventListener('click', () => {
    openModal('modal-help');
  });
  document.getElementById('btn-close-help-modal').addEventListener('click', () => {
    closeModal('modal-help');
  });
  document.getElementById('btn-confirm-help').addEventListener('click', () => {
    closeModal('modal-help');
  });

  // 거래 모달 닫기 및 수량 조작
  document.getElementById('btn-close-trade-modal').addEventListener('click', () => closeModal('modal-trade'));
  document.getElementById('btn-cancel-trade').addEventListener('click', () => closeModal('modal-trade'));
  document.getElementById('btn-qty-minus').addEventListener('click', () => adjustTradeQuantity(-1));
  document.getElementById('btn-qty-plus').addEventListener('click', () => adjustTradeQuantity(1));
  document.getElementById('trade-quantity').addEventListener('input', onQuantityInputChange);

  document.querySelectorAll('.btn-quick-qty').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.id === 'btn-qty-max') {
        setTradeQuantity(currentTradeContext.maxQuantity);
      } else {
        const qty = parseInt(e.target.dataset.qty, 10);
        setTradeQuantity(qty);
      }
    });
  });

  // 거래 확정 버튼
  document.getElementById('btn-confirm-trade').addEventListener('click', executeTradeAction);

  // 3라운드 비교 모달 열기/닫기
  document.getElementById('btn-open-compare').addEventListener('click', openCompareModal);
  document.getElementById('btn-close-compare-modal').addEventListener('click', () => closeModal('modal-compare'));
  document.getElementById('btn-close-compare').addEventListener('click', () => closeModal('modal-compare'));
  document.getElementById('compare-item-select').addEventListener('change', updateCompareAnalysis);

  // 최종 결과 모달: 복사 및 재시작
  document.getElementById('btn-copy-worksheet').addEventListener('click', copyWorksheetSummary);
  document.getElementById('btn-restart-game').addEventListener('click', () => {
    closeModal('modal-final-result');
    initGame();
  });

  // 지도 위의 허브 클릭 이벤트 바인딩
  document.querySelectorAll('.hub-node').forEach(node => {
    node.addEventListener('click', () => {
      const hubId = node.dataset.hub;
      onHubNodeClick(hubId);
    });
  });
}

// ==========================================================================
// [화면 렌더링 & 갱신 (Render All)]
// ==========================================================================
function renderAll() {
  renderHeaderStatus();
  renderMap();
  renderTabsState();
  renderMarketPane();
  renderMovePane();
  renderMiddlemanPane();
  renderLogPane();
}

/** 헤더 상태 바 업데이트 */
function renderHeaderStatus() {
  const currentHub = GAME_CONFIG.HUBS[gameState.location];
  document.getElementById('header-location').textContent = `${currentHub.flag} ${currentHub.name}`;
  document.getElementById('header-money').textContent = `${gameState.funds.toLocaleString()} 냥`;

  const totalRoundDays = GAME_CONFIG.ROUND_DAYS[gameState.round];
  const remainingDays = totalRoundDays - gameState.roundElapsedDays;
  document.getElementById('header-days').innerHTML = `${gameState.currentDay}일차 <small>(남은 기간: ${remainingDays}일)</small>`;

  const netProfit = gameState.stats.totalRevenue - gameState.stats.totalExpenses;
  const profitElem = document.getElementById('header-profit');
  if (netProfit > 0) {
    profitElem.className = 'chip-val green-text';
    profitElem.textContent = `+${netProfit.toLocaleString()} 냥`;
  } else if (netProfit < 0) {
    profitElem.className = 'chip-val red-text';
    profitElem.textContent = `${netProfit.toLocaleString()} 냥`;
  } else {
    profitElem.className = 'chip-val';
    profitElem.textContent = `0 냥`;
  }

  // 라운드 뱃지 텍스트
  const roundNames = {
    1: '1라운드: 지역 내 교역',
    2: '2라운드: 직접 이동 교역',
    3: '3라운드: 중계무역'
  };
  document.getElementById('round-badge').textContent = roundNames[gameState.round];

  // 상단 라운드 스텝 바
  document.getElementById('step-r1').className = `round-step step-1 ${gameState.round === 1 ? 'active' : 'completed'}`;
  document.getElementById('step-r2').className = `round-step step-2 ${gameState.round === 2 ? 'active' : (gameState.round > 2 ? 'completed' : '')}`;
  document.getElementById('step-r3').className = `round-step step-3 ${gameState.round === 3 ? 'active' : ''}`;
  document.getElementById('line-r1-r2').className = `step-line ${gameState.round >= 2 ? 'completed' : ''}`;
  document.getElementById('line-r2-r3').className = `step-line ${gameState.round >= 3 ? 'completed' : ''}`;
}

/** 지도 렌더링 (플레이어 핀 위치, 허브 활성/도달 상태, 경로 하이라이트) */
function renderMap() {
  const currentHub = GAME_CONFIG.HUBS[gameState.location];

  // 플레이어 핀 이동
  const pin = document.getElementById('player-location-pin');
  pin.setAttribute('transform', `translate(${currentHub.x}, ${currentHub.y})`);

  // 모든 허브 노드 클래스 갱신
  const connectedHubs = getReachableHubs(gameState.location);
  document.querySelectorAll('.hub-node').forEach(node => {
    const hubId = node.dataset.hub;
    node.classList.remove('active-hub', 'reachable-hub');

    if (hubId === gameState.location) {
      node.classList.add('active-hub');
    } else if (gameState.round >= 2 && connectedHubs.includes(hubId)) {
      node.classList.add('reachable-hub');
    }
  });

  // 경로 하이라이트
  document.querySelectorAll('.trade-route-path').forEach(path => {
    path.classList.remove('highlight-reachable');
  });

  if (gameState.round >= 2) {
    const availableRoutes = getAvailableRoutes(gameState.location);
    availableRoutes.forEach(r => {
      const pathElem = document.getElementById(r.svgPathId);
      if (pathElem) pathElem.classList.add('highlight-reachable');
    });
  }

  // 지도 하단 안내 문구
  const guideText = document.getElementById('map-guide-text');
  if (gameState.round === 1) {
    guideText.textContent = `1라운드: 현재 머무는 [${currentHub.name}]에서 특산물을 사고팔아 보세요. (다른 지역 이동 불가)`;
  } else if (gameState.round === 2) {
    guideText.textContent = `2라운드: 인접한 초록색 거점(⛵ 해상, 🐪 육상)을 클릭하거나 [지역 이동] 탭에서 직접 항해해 보세요!`;
  } else {
    guideText.textContent = `3라운드: [중계무역상] 탭에서 원격 거래를 하거나, 직교역과의 시간·비용 차이를 비교해 보세요!`;
  }
}

/** 탭 잠금/해제 상태 */
function renderTabsState() {
  const moveTabBtn = document.getElementById('tab-move-btn');
  const middlemanTabBtn = document.getElementById('tab-middleman-btn');

  if (gameState.round >= 2) {
    moveTabBtn.removeAttribute('disabled');
  } else {
    moveTabBtn.setAttribute('disabled', 'true');
  }

  if (gameState.round >= 3) {
    middlemanTabBtn.removeAttribute('disabled');
  } else {
    middlemanTabBtn.setAttribute('disabled', 'true');
  }
}

/** 탭 1: 시장(거래) 패널 렌더링 */
function renderMarketPane() {
  const currentHub = GAME_CONFIG.HUBS[gameState.location];
  document.getElementById('market-city-name').textContent = `${currentHub.flag} ${currentHub.name} 시장`;

  const buyContainer = document.getElementById('buy-goods-list');
  const sellContainer = document.getElementById('sell-goods-list');
  buyContainer.innerHTML = '';
  sellContainer.innerHTML = '';

  // 1. 시장에서 살 수 있는 상품 목록
  Object.values(GAME_CONFIG.GOODS).forEach(good => {
    const priceInfo = good.prices[gameState.location];
    if (!priceInfo) return;

    const isLocalSpecialty = (good.origin === gameState.location);
    const card = document.createElement('div');
    card.className = 'goods-card';
    card.innerHTML = `
      <div class="goods-main-info">
        <div class="goods-icon">${good.icon}</div>
        <div class="goods-texts">
          <span class="goods-name">${good.name} ${isLocalSpecialty ? '⭐' : ''}</span>
          <span class="goods-origin-tag">${good.originName} ${isLocalSpecialty ? '(현지 원산지 특가)' : ''}</span>
        </div>
      </div>
      <div class="goods-price-box">
        <span class="goods-price-val gold-text">${priceInfo.buy} 냥</span>
        <button class="btn-trade-action btn-trade-buy" onclick="openTradeModal('buy', '${good.id}')">구매하기</button>
      </div>
    `;
    buyContainer.appendChild(card);
  });

  // 2. 내가 보유 중이라 판매할 수 있는 상품 목록
  let hasInventoryToSell = false;
  Object.entries(gameState.inventory).forEach(([goodId, qty]) => {
    if (qty <= 0) return;
    hasInventoryToSell = true;

    const good = GAME_CONFIG.GOODS[goodId];
    const priceInfo = good.prices[gameState.location];
    const isFromDistant = (good.origin !== gameState.location);

    const card = document.createElement('div');
    card.className = 'goods-card';
    card.innerHTML = `
      <div class="goods-main-info">
        <div class="goods-icon">${good.icon}</div>
        <div class="goods-texts">
          <span class="goods-name">${good.name} <small>(${qty}개 보유)</small></span>
          <span class="goods-origin-tag">${good.originName} ${isFromDistant ? '🔥(먼 지역 귀중품)' : ''}</span>
        </div>
      </div>
      <div class="goods-price-box">
        <span class="goods-price-val green-text">${priceInfo.sell} 냥</span>
        <button class="btn-trade-action btn-trade-sell" onclick="openTradeModal('sell', '${good.id}')">판매하기</button>
      </div>
    `;
    sellContainer.appendChild(card);
  });

  if (!hasInventoryToSell) {
    sellContainer.innerHTML = `<div class="empty-goods-msg">현재 보유한 물품이 없습니다.<br>좌측 시장에서 상품을 먼저 구매해 보세요!</div>`;
  }

  // 3. 화물 창고 인라인 요약 바
  renderInventoryBar();
}

/** 화물 창고 인라인 바 렌더링 */
function renderInventoryBar() {
  const container = document.getElementById('inventory-items-inline');
  container.innerHTML = '';

  const items = Object.entries(gameState.inventory).filter(([_, qty]) => qty > 0);
  if (items.length === 0) {
    container.innerHTML = `<span class="empty-inv">보유 상품 없음</span>`;
    return;
  }

  items.forEach(([goodId, qty]) => {
    const good = GAME_CONFIG.GOODS[goodId];
    const pill = document.createElement('span');
    pill.className = 'inv-pill';
    pill.innerHTML = `${good.icon} ${good.name} <span class="inv-count">${qty}개</span>`;
    container.appendChild(pill);
  });
}

/** 탭 2: 지역 이동 패널 렌더링 */
function renderMovePane() {
  const container = document.getElementById('move-destinations-list');
  container.innerHTML = '';

  if (gameState.round < 2) {
    container.innerHTML = `<div class="empty-goods-msg">2라운드부터 육상 및 해상 직접 이동이 가능합니다.</div>`;
    return;
  }

  const availableRoutes = getAvailableRoutes(gameState.location);
  const remainingDays = GAME_CONFIG.ROUND_DAYS[gameState.round] - gameState.roundElapsedDays;

  availableRoutes.forEach(route => {
    const destHubId = (route.from === gameState.location) ? route.to : route.from;
    const destHub = GAME_CONFIG.HUBS[destHubId];
    const livingCostForTrip = route.days * GAME_CONFIG.DAILY_LIVING_COST;
    const totalTripCost = route.transportCost + livingCostForTrip;

    const canAffordMoney = (gameState.funds >= totalTripCost);
    const canAffordDays = (remainingDays >= route.days);
    const canTravel = canAffordMoney && canAffordDays;

    let disableReason = '';
    if (!canAffordDays) disableReason = '남은 시간 부족';
    else if (!canAffordMoney) disableReason = '자금 부족';

    const card = document.createElement('div');
    card.className = 'dest-route-card';
    card.innerHTML = `
      <div class="dest-info-group">
        <div class="dest-mode-icon">${route.modeIcon}</div>
        <div class="dest-text-group">
          <h3>
            ${destHub.flag} ${destHub.name}
            <span class="dest-mode-label ${route.type === 'sea' ? 'mode-sea' : 'mode-land'}">${route.modeName}</span>
          </h3>
          <div class="dest-goods-preview">대표 특산물: ${destHub.primaryGoods.map(g => GAME_CONFIG.GOODS[g].name).join(', ')}</div>
          <p class="dest-route-desc" style="font-size:0.75rem; color:#94a3b8;">${route.desc}</p>
        </div>
      </div>
      <div class="dest-cost-table">
        <div class="dest-cost-row">소요 시간: <strong>${route.days}일</strong></div>
        <div class="dest-cost-row">운송비: <span class="red-text">-${route.transportCost}냥</span></div>
        <div class="dest-cost-row">예상 운영비(${route.days}일): <span class="red-text">-${livingCostForTrip}냥</span></div>
        <div class="dest-total-cost">총비용: -${totalTripCost}냥</div>
        <button class="btn-start-travel" ${canTravel ? '' : 'disabled'}
          onclick="confirmTravel('${destHubId}', '${route.id}')">
          ${canTravel ? `${route.days}일 이동 시작` : disableReason}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/** 탭 3: 중계무역 패널 렌더링 */
function renderMiddlemanPane() {
  const container = document.getElementById('middleman-goods-grid');
  container.innerHTML = '';

  if (gameState.round < 3) {
    container.innerHTML = `<div class="empty-goods-msg">3라운드부터 중계무역상 이용이 가능합니다.</div>`;
    return;
  }

  // 다른 지역의 상품들을 중계무역으로 구매 가능
  Object.values(GAME_CONFIG.GOODS).forEach(good => {
    // 현재 지역 상품이 아닌 타 지역의 상품 위주로 추천
    const isOtherOrigin = (good.origin !== gameState.location);
    const originHub = GAME_CONFIG.HUBS[good.origin];
    const baseBuyPrice = good.prices[good.origin].buy;
    const commission = Math.round(baseBuyPrice * GAME_CONFIG.MIDDLEMAN_COMMISSION_RATE);
    const totalRemoteCost = baseBuyPrice + commission;

    const card = document.createElement('div');
    card.className = 'middleman-card';
    card.innerHTML = `
      <div class="card-top">
        <span class="goods-icon">${good.icon}</span>
        <div>
          <strong style="color:#fff;">${good.name}</strong>
          <div style="font-size:0.75rem; color:#a855f7;">${originHub.flag} ${originHub.name} 직수입</div>
        </div>
      </div>
      <div class="card-pricing">
        <div>현지 원가: <strong>${baseBuyPrice} 냥</strong></div>
        <div>중계 수수료 (35%): <span class="red-text">+${commission} 냥</span></div>
        <hr style="border:none; border-top:1px dashed rgba(255,255,255,0.1); margin:4px 0;">
        <div style="font-weight:700; color:#c084fc;">원격 구매가: ${totalRemoteCost} 냥/개</div>
        <div style="font-size:0.72rem; color:#94a3b8;">소요 시간: <strong>단 1일</strong> (운영비 5냥)</div>
      </div>
      <button class="btn-middleman-order" onclick="openTradeModal('middleman', '${good.id}')">
        🤝 중계상 발주 (1일 소요)
      </button>
    `;
    container.appendChild(card);
  });
}

/** 탭 4: 활동 기록(장부) 렌더링 */
function renderLogPane() {
  const statsElem = document.getElementById('log-summary-stats');
  statsElem.innerHTML = `
    <span class="log-summary-chip">총 수익: <strong class="green-text">+${gameState.stats.totalRevenue}냥</strong></span>
    <span class="log-summary-chip">총 지출: <strong class="red-text">-${gameState.stats.totalExpenses}냥</strong></span>
    <span class="log-summary-chip">운영비: <strong class="red-text">-${gameState.stats.expenseLiving}냥</strong></span>
    <span class="log-summary-chip">수수료: <strong class="red-text">-${gameState.stats.expenseCommission}냥</strong></span>
  `;

  const container = document.getElementById('activity-log-list');
  container.innerHTML = '';

  if (gameState.stats.logs.length === 0) {
    container.innerHTML = `<div class="empty-goods-msg">아직 기록된 활동이 없습니다.</div>`;
    return;
  }

  // 최신순 렌더링
  [...gameState.stats.logs].reverse().forEach(log => {
    const item = document.createElement('div');
    item.className = `log-item log-${log.type}`;

    let amountHtml = '';
    if (log.amount > 0) {
      amountHtml = `<span class="log-amount green-text">+${log.amount} 냥</span>`;
    } else if (log.amount < 0) {
      amountHtml = `<span class="log-amount red-text">${log.amount} 냥</span>`;
    }

    item.innerHTML = `
      <span class="log-time">${log.day}일차 [${log.hubName}]</span>
      <span class="log-text">${log.text}</span>
      ${amountHtml}
    `;
    container.appendChild(item);
  });
}

/** 탭 전환 함수 */
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const pane = document.getElementById(`pane-${tabId}`);
  if (btn) btn.classList.add('active');
  if (pane) pane.classList.add('active');
}

// ==========================================================================
// [지도 상호작용 및 이동 로직]
// ==========================================================================

/** 지도 위 허브 클릭 핸들러 */
function onHubNodeClick(hubId) {
  if (hubId === gameState.location) {
    switchTab('trade');
    showToast('info', `현재 머물고 계신 [${GAME_CONFIG.HUBS[hubId].name}] 시장입니다.`);
    return;
  }

  if (gameState.round === 1) {
    showToast('expense', `1라운드에는 다른 지역으로 이동할 수 없습니다. 현재 지역 내 교역을 먼저 체험해 보세요.`);
    return;
  }

  // 2, 3라운드: 인접 노드 확인
  const availableRoutes = getAvailableRoutes(gameState.location);
  const route = availableRoutes.find(r => r.from === hubId || r.to === hubId);

  if (!route) {
    showToast('expense', `현재 위치에서 [${GAME_CONFIG.HUBS[hubId].name}]로 바로 갈 수 있는 직통 경로가 없습니다. 중간 경유지를 확인하세요.`);
    return;
  }

  switchTab('move');
  showToast('info', `[${GAME_CONFIG.HUBS[hubId].name}] 이동 경로 정보를 확인하고 이동을 시작하세요.`);
}

/** 현재 위치에서 연결된 경로 목록 구하기 */
function getAvailableRoutes(currentHubId) {
  return GAME_CONFIG.ROUTES.filter(r => r.from === currentHubId || r.to === currentHubId);
}

/** 현재 위치에서 도달 가능한 허브 ID 목록 */
function getReachableHubs(currentHubId) {
  return getAvailableRoutes(currentHubId).map(r => (r.from === currentHubId ? r.to : r.from));
}

/** 직접 이동 확정 및 애니메이션 */
function confirmTravel(destHubId, routeId) {
  const route = GAME_CONFIG.ROUTES.find(r => r.id === routeId);
  const destHub = GAME_CONFIG.HUBS[destHubId];
  const remainingDays = GAME_CONFIG.ROUND_DAYS[gameState.round] - gameState.roundElapsedDays;

  if (remainingDays < route.days) {
    showToast('expense', `⚠️ 남은 시간이 부족합니다! (필요: ${route.days}일, 남은 시간: ${remainingDays}일)`);
    return;
  }

  const livingCost = route.days * GAME_CONFIG.DAILY_LIVING_COST;
  const totalCost = route.transportCost + livingCost;

  if (gameState.funds < totalCost) {
    showToast('expense', `⚠️ 이동에 필요한 자금이 부족합니다! (필요: ${totalCost}냥, 보유: ${gameState.funds}냥)`);
    return;
  }

  // 이동 실행 (애니메이션 동반)
  animateTravelPath(route, destHubId, () => {
    // 1. 운송비 및 고정 운영비 차감
    gameState.funds -= route.transportCost;
    gameState.stats.expenseTransport += route.transportCost;
    gameState.stats.totalExpenses += route.transportCost;

    logActivity('travel', `${route.modeName}: ${destHub.name} 도착 (운송비 -${route.transportCost}냥)`, -route.transportCost);

    if (route.type === 'sea') {
      gameState.stats.seaTrips++;
    } else {
      gameState.stats.landTrips++;
    }

    // 2. 시간 경과 및 거점 변경
    gameState.location = destHubId;
    gameState.stats.visitedHubs.add(destHubId);

    // 날짜 및 고정 운영비 자동 처리
    advanceDays(route.days, `${destHub.name} 이동 여정 (${route.days}일 소요)`);

    showToast('info', `📍 ${destHub.name}에 무사히 도착했습니다! 새로운 시장 특산물을 확인하세요.`);
    switchTab('trade');
    renderAll();
  });
}

/** SVG 경로를 따라 이동하는 애니메이션 */
function animateTravelPath(route, destHubId, onComplete) {
  const pathElem = document.getElementById(route.svgPathId);
  const marker = document.getElementById('travel-anim-marker');
  const markerIcon = document.getElementById('travel-anim-icon');

  if (!pathElem || !marker) {
    if (onComplete) onComplete();
    return;
  }

  // 모든 버튼 임시 비활성화
  document.querySelectorAll('button').forEach(b => b.style.pointerEvents = 'none');

  markerIcon.textContent = route.modeIcon;
  marker.style.display = 'block';

  const pathLength = pathElem.getTotalLength();
  const isReverse = (route.to !== destHubId); // 역방향 이동 여부

  const duration = 1200; // 1.2초
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);

    const currentLen = isReverse
      ? pathLength * (1 - progress)
      : pathLength * progress;

    const pt = pathElem.getPointAtLength(currentLen);
    marker.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      marker.style.display = 'none';
      document.querySelectorAll('button').forEach(b => b.style.pointerEvents = 'auto');
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(step);
}

// ==========================================================================
// [거래 시스템 (구매, 판매, 중계무역)]
// ==========================================================================

/** 거래 모달 열기 */
function openTradeModal(mode, itemId) {
  const good = GAME_CONFIG.GOODS[itemId];
  const currentHub = GAME_CONFIG.HUBS[gameState.location];
  currentTradeContext.mode = mode;
  currentTradeContext.itemId = itemId;
  currentTradeContext.hubId = gameState.location;

  const modalTitle = document.getElementById('trade-modal-title');
  const itemIcon = document.getElementById('trade-item-icon');
  const itemName = document.getElementById('trade-item-name');
  const itemDesc = document.getElementById('trade-item-desc');
  const actionLabel = document.getElementById('trade-action-label');
  const unitPriceVal = document.getElementById('trade-unit-price-val');
  const feeRow = document.getElementById('calc-middleman-fee-row');

  itemIcon.textContent = good.icon;
  itemName.textContent = good.name;
  itemDesc.textContent = good.desc;

  let unitPrice = 0;
  let maxQty = 1;

  if (mode === 'buy') {
    modalTitle.textContent = `🛒 ${good.name} 시장 구매`;
    unitPrice = good.prices[gameState.location].buy;
    actionLabel.textContent = '구매 단가:';
    unitPriceVal.textContent = `${unitPrice} 냥`;
    feeRow.style.display = 'none';

    // 구매 최대 수량 = (현재 보유 자금 - 1일 생활비 5냥) / 단가
    const availableFunds = Math.max(0, gameState.funds - GAME_CONFIG.DAILY_LIVING_COST);
    maxQty = Math.max(1, Math.floor(availableFunds / unitPrice));
  } else if (mode === 'sell') {
    modalTitle.textContent = `💰 ${good.name} 보유 상품 판매`;
    unitPrice = good.prices[gameState.location].sell;
    actionLabel.textContent = '판매 단가:';
    unitPriceVal.textContent = `${unitPrice} 냥`;
    feeRow.style.display = 'none';

    // 판매 최대 수량 = 내 인벤토리 보유량
    maxQty = gameState.inventory[itemId] || 0;
  } else if (mode === 'middleman') {
    modalTitle.textContent = `🤝 ${good.name} 중계무역 원격 주문`;
    unitPrice = good.prices[good.origin].buy; // 현지 원가
    actionLabel.textContent = '현지 원가:';
    unitPriceVal.textContent = `${unitPrice} 냥 (수수료 35% 별도)`;
    feeRow.style.display = 'flex';

    // 1개당 비용 = 원가 + 35% 수수료
    const singleCostWithFee = unitPrice + Math.round(unitPrice * GAME_CONFIG.MIDDLEMAN_COMMISSION_RATE);
    const availableFunds = Math.max(0, gameState.funds - GAME_CONFIG.DAILY_LIVING_COST);
    maxQty = Math.max(1, Math.floor(availableFunds / singleCostWithFee));
  }

  currentTradeContext.unitPrice = unitPrice;
  currentTradeContext.maxQuantity = Math.max(1, maxQty);

  // 기본 수량 1개로 세팅하고 계산 갱신
  setTradeQuantity(1);
  openModal('modal-trade');
}

/** 수량 버튼 조작 (- / +) */
function adjustTradeQuantity(delta) {
  const input = document.getElementById('trade-quantity');
  let currentVal = parseInt(input.value, 10) || 1;
  setTradeQuantity(currentVal + delta);
}

/** 수량 직접 입력 핸들러 */
function onQuantityInputChange(e) {
  let val = parseInt(e.target.value, 10);
  if (isNaN(val) || val < 1) val = 1;
  setTradeQuantity(val);
}

/** 수량 설정 및 계산서 실시간 업데이트 */
function setTradeQuantity(qty) {
  const input = document.getElementById('trade-quantity');
  qty = Math.max(1, Math.min(qty, 99));
  input.value = qty;

  const mode = currentTradeContext.mode;
  const unitPrice = currentTradeContext.unitPrice;
  const baseTotal = qty * unitPrice;
  const livingCost = GAME_CONFIG.DAILY_LIVING_COST; // 1일 5냥

  let middlemanFee = 0;
  if (mode === 'middleman') {
    middlemanFee = Math.round(baseTotal * GAME_CONFIG.MIDDLEMAN_COMMISSION_RATE);
  }

  document.getElementById('calc-goods-total').textContent = `${baseTotal.toLocaleString()} 냥`;
  document.getElementById('calc-middleman-fee').textContent = `+${middlemanFee.toLocaleString()} 냥`;

  const finalLabel = document.getElementById('calc-final-label');
  const finalTotal = document.getElementById('calc-final-total');
  const afterBalance = document.getElementById('calc-after-balance');
  const afterDays = document.getElementById('calc-after-days');
  const warningMsg = document.getElementById('trade-warning-msg');
  const confirmBtn = document.getElementById('btn-confirm-trade');

  const remainingDays = GAME_CONFIG.ROUND_DAYS[gameState.round] - gameState.roundElapsedDays;
  const afterDaysVal = remainingDays - 1;

  let canExecute = true;
  let warnText = '';

  // 시간 부족 체크
  if (remainingDays < 1) {
    canExecute = false;
    warnText = '⚠️ 이번 라운드의 남은 기간이 부족하여 거래할 수 없습니다.';
  }

  if (mode === 'buy') {
    const totalExpenditure = baseTotal + livingCost;
    const balanceAfter = gameState.funds - totalExpenditure;

    finalLabel.textContent = '예상 총 지출 (물품대금 + 1일 운영비):';
    finalTotal.className = 'red-text';
    finalTotal.textContent = `-${totalExpenditure.toLocaleString()} 냥`;
    afterBalance.textContent = `${balanceAfter.toLocaleString()} 냥`;

    if (balanceAfter < 0) {
      canExecute = false;
      warnText = `⚠️ 보유 자금이 부족합니다. (필요: ${totalExpenditure}냥, 보유: ${gameState.funds}냥)`;
    }
  } else if (mode === 'sell') {
    const netReturn = baseTotal - livingCost;
    const balanceAfter = gameState.funds + netReturn;

    finalLabel.textContent = '예상 정산 금액 (판매수익 - 1일 운영비):';
    finalTotal.className = (netReturn >= 0) ? 'green-text' : 'red-text';
    finalTotal.textContent = `${netReturn >= 0 ? '+' : ''}${netReturn.toLocaleString()} 냥`;
    afterBalance.textContent = `${balanceAfter.toLocaleString()} 냥`;

    const myStock = gameState.inventory[currentTradeContext.itemId] || 0;
    if (qty > myStock) {
      canExecute = false;
      warnText = `⚠️ 판매할 상품의 보유량이 부족합니다. (보유량: ${myStock}개)`;
    } else if (balanceAfter < 0) {
      canExecute = false;
      warnText = `⚠️ 하루 운영비(5냥)를 지출할 최소 자금이 부족합니다.`;
    }
  } else if (mode === 'middleman') {
    const totalExpenditure = baseTotal + middlemanFee + livingCost;
    const balanceAfter = gameState.funds - totalExpenditure;

    finalLabel.textContent = '예상 총 지출 (원가 + 수수료 + 운영비):';
    finalTotal.className = 'red-text';
    finalTotal.textContent = `-${totalExpenditure.toLocaleString()} 냥`;
    afterBalance.textContent = `${balanceAfter.toLocaleString()} 냥`;

    if (balanceAfter < 0) {
      canExecute = false;
      warnText = `⚠️ 보유 자금이 부족합니다. (필요: ${totalExpenditure}냥, 보유: ${gameState.funds}냥)`;
    }
  }

  afterDays.textContent = `${afterDaysVal}일`;

  if (!canExecute) {
    warningMsg.textContent = warnText;
    warningMsg.style.display = 'block';
    confirmBtn.disabled = true;
    confirmBtn.textContent = '거래 불가';
  } else {
    warningMsg.style.display = 'none';
    confirmBtn.disabled = false;
    confirmBtn.textContent = '거래 확정 (1일 소요)';
  }
}

/** 거래 확정 실행 */
function executeTradeAction() {
  const input = document.getElementById('trade-quantity');
  const qty = parseInt(input.value, 10) || 1;
  const { mode, itemId, unitPrice } = currentTradeContext;
  const good = GAME_CONFIG.GOODS[itemId];
  const baseTotal = qty * unitPrice;

  closeModal('modal-trade');

  if (mode === 'buy') {
    // 1. 자금 및 인벤토리 업데이트
    gameState.funds -= baseTotal;
    gameState.stats.expenseGoods += baseTotal;
    gameState.stats.totalExpenses += baseTotal;
    gameState.inventory[itemId] = (gameState.inventory[itemId] || 0) + qty;

    logActivity('expense', `${good.name} ${qty}개 시장 구매 완료`, -baseTotal);
    showToast('expense', `🛒 ${good.name} ${qty}개 구매 (-${baseTotal}냥)`);

    // 2. 시간 경과 (1일 및 고정운영비 5냥)
    advanceDays(1, `${good.name} 구매 거래일`);
  } else if (mode === 'sell') {
    gameState.funds += baseTotal;
    gameState.stats.totalRevenue += baseTotal;
    gameState.inventory[itemId] -= qty;

    logActivity('profit', `${good.name} ${qty}개 판매 완료 (+${baseTotal}냥)`, baseTotal);
    showToast('profit', `💰 ${good.name} ${qty}개 판매 완료 (+${baseTotal}냥)`);

    advanceDays(1, `${good.name} 판매 거래일`);
  } else if (mode === 'middleman') {
    const commission = Math.round(baseTotal * GAME_CONFIG.MIDDLEMAN_COMMISSION_RATE);
    const totalOrderCost = baseTotal + commission;

    gameState.funds -= totalOrderCost;
    gameState.stats.expenseGoods += baseTotal;
    gameState.stats.expenseCommission += commission;
    gameState.stats.totalExpenses += totalOrderCost;
    gameState.stats.middlemanOrders++;

    gameState.inventory[itemId] = (gameState.inventory[itemId] || 0) + qty;

    logActivity('middleman', `🤝 중계무역: ${good.name} ${qty}개 원격 수입 (원가 ${baseTotal} + 수수료 ${commission}냥)`, -totalOrderCost);
    showToast('expense', `🤝 중계무역 완수: ${good.name} ${qty}개 입고 (-${totalOrderCost}냥, 수수료 35% 포함)`);

    advanceDays(1, `중계무역상 원격 발주일`);
  }

  renderAll();
}

// ==========================================================================
// [시간 시스템 & 라운드 전환 로직]
// ==========================================================================

/** 날짜 경과 및 일일 고정 운영비 자동 차감 */
function advanceDays(days, reason) {
  gameState.currentDay += days;
  gameState.roundElapsedDays += days;

  // 하루 고정 운영비 자동 차감 (하루당 5냥)
  const livingCost = days * GAME_CONFIG.DAILY_LIVING_COST;
  gameState.funds -= livingCost;
  gameState.stats.expenseLiving += livingCost;
  gameState.stats.totalExpenses += livingCost;

  logActivity('expense', `일일 고정 운영비 (${days}일분: 식비·숙박비 등) 지출`, -livingCost);
  showToast('expense', `🔴 일일 고정 운영비 (-${livingCost}냥, ${days}일분)`);

  // 라운드 종료 체크
  const totalRoundDays = GAME_CONFIG.ROUND_DAYS[gameState.round];
  if (gameState.roundElapsedDays >= totalRoundDays) {
    triggerRoundDebrief();
  }
}

/** 라운드 종료 및 학습지 질문 모달 표시 */
function triggerRoundDebrief() {
  const debriefTitle = document.getElementById('debrief-title');
  const banner = document.getElementById('debrief-stats-banner');
  const questionText = document.getElementById('debrief-question-text');
  const nextBtn = document.getElementById('btn-next-round');

  debriefTitle.textContent = `🎉 ${gameState.round}라운드 활동 종료 & 학습지 정리`;

  const netProfit = gameState.stats.totalRevenue - gameState.stats.totalExpenses;
  banner.innerHTML = `
    <strong>📊 현재까지의 무역 누적 성과:</strong><br>
    보유 자금: <strong>${gameState.funds.toLocaleString()} 냥</strong> | 
    누적 순이익: <strong class="${netProfit >= 0 ? 'green-text' : 'red-text'}">${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} 냥</strong> | 
    총 경과 일수: <strong>${gameState.currentDay - 1}일</strong>
  `;

  if (gameState.round === 1) {
    questionText.textContent = `"내가 거래한 상품은 무엇이며, 지역마다 거래할 수 있는 상품에 차이가 있었는가?"`;
    nextBtn.textContent = '2라운드: 직접 이동 교역 시작하기 ➡️';
  } else if (gameState.round === 2) {
    questionText.textContent = `"직접 다른 지역으로 이동하여 교역하면서 어떤 점을 경험했는가? 이동 과정에서 어떤 비용과 어려움이 발생했는가?"`;
    nextBtn.textContent = '3라운드: 중계무역 시작하기 ➡️';
  } else if (gameState.round === 3) {
    questionText.textContent = `"중계무역을 이용하면 직접 이동하는 것과 비교해 어떤 점이 편리했는가?"`;
    nextBtn.textContent = '🏆 최종 무역 결과 보고서 보기 ➡️';
  }

  openModal('modal-round-debrief');
}

/** 다음 라운드로 전환 */
function advanceToNextRound() {
  if (gameState.round === 1) {
    gameState.round = 2;
    gameState.roundElapsedDays = 0;
    renderAll();
    showRoundIntroModal(2);
  } else if (gameState.round === 2) {
    gameState.round = 3;
    gameState.roundElapsedDays = 0;
    renderAll();
    showRoundIntroModal(3);
  } else if (gameState.round === 3) {
    // 최종 결과 화면 표시
    showFinalResultsModal();
  }
}

/** 라운드 시작 안내 모달 표시 */
function showRoundIntroModal(roundNum) {
  const tag = document.getElementById('intro-round-tag');
  const title = document.getElementById('intro-round-title');
  const goal = document.getElementById('intro-round-goal');
  const desc = document.getElementById('intro-round-desc');
  const days = document.getElementById('intro-round-days');
  const features = document.getElementById('intro-round-features');

  tag.textContent = `${roundNum}라운드 안내`;
  days.textContent = `총 ${GAME_CONFIG.ROUND_DAYS[roundNum]}일`;

  if (roundNum === 1) {
    title.textContent = '우리 지역에서 교역하기!';
    goal.textContent = '지역마다 거래할 수 있는 상품에 차이가 있음을 경험하고 지역 간 교역의 필요성을 생각한다.';
    desc.textContent = '여러분은 무역상이 되어 교역을 시작합니다. 현재 머물고 있는 지역에서 상품을 구매하거나 판매할 수 있습니다. 다른 지역으로 이동할 수는 없습니다. 우리 지역에서 거래할 수 있는 상품을 살펴보고 교역을 시작해 보세요.';
    features.textContent = '지역 내 상품 구매/판매';
  } else if (roundNum === 2) {
    title.textContent = '다른 지역으로 이동하기!';
    goal.textContent = '육상 및 해상 이동을 통해 다른 지역으로 이동하고, 장거리 교역에 필요한 시간과 비용을 경험한다.';
    desc.textContent = '이제부터 다른 지역으로 직접 이동하여 교역할 수 있습니다. 육상과 해상 중 이동 경로를 선택할 수 있으며, 경로에 따라 소요 시간과 운송비가 달라집니다. 이동에 필요한 시간과 비용을 고려하여 새로운 지역에서 교역해 보세요.';
    features.textContent = '⛵ 해상 및 🐪 육상 직접 이동 해금';
  } else if (roundNum === 3) {
    title.textContent = '중계무역상 이용하기!';
    goal.textContent = '중계무역상을 통해 직접 이동하지 않고도 먼 지역의 상품을 거래할 수 있음을 경험하고 중간 상인의 역할을 이해한다.';
    desc.textContent = '먼 지역까지 직접 이동하지 않아도 상품을 거래할 수 있는 방법이 생겼습니다. 바로 중계무역상을 이용하는 것입니다. 중계무역상을 이용하면 직접 이동하는 데 필요한 시간과 수고를 줄일 수 있지만, 별도의 수수료가 발생합니다. 직접 이동하는 방법과 중계무역을 이용하는 방법 중 어떤 것이 더 유리할지 판단해 보세요.';
    features.textContent = '🤝 중계무역상 원격 발주 및 비교 도구';
  }

  openModal('modal-round-intro');
}

// ==========================================================================
// [3라운드: 직접 이동 vs 중계무역 비교 분석기]
// ==========================================================================
function openCompareModal() {
  const select = document.getElementById('compare-item-select');
  select.innerHTML = '';

  // 타 지역의 상품 목록 추가
  Object.values(GAME_CONFIG.GOODS).forEach(good => {
    if (good.origin !== gameState.location) {
      const option = document.createElement('option');
      option.value = good.id;
      option.textContent = `${good.icon} ${good.name} (원산지: ${GAME_CONFIG.HUBS[good.origin].name})`;
      select.appendChild(option);
    }
  });

  updateCompareAnalysis();
  openModal('modal-compare');
}

/** 비교 분석 데이터 동적 계산 및 렌더링 */
function updateCompareAnalysis() {
  const select = document.getElementById('compare-item-select');
  const itemId = select.value || 'silk';
  const good = GAME_CONFIG.GOODS[itemId];
  const originHub = GAME_CONFIG.HUBS[good.origin];
  const currentHub = GAME_CONFIG.HUBS[gameState.location];

  // 1. 방식 A: 직접 이동 (왕복 기준)
  // 현재 위치에서 원산지까지의 최단 왕복 일수 및 운송비 추정
  let travelDaysOneWay = 2;
  let transportCostOneWay = 25;

  if ((gameState.location === 'india' && good.origin === 'china') ||
      (gameState.location === 'china' && good.origin === 'india')) {
    // 인도 <-> 동남아 <-> 중국 (2단계 해상 = 편도 4일)
    travelDaysOneWay = 4;
    transportCostOneWay = 50;
  } else if ((gameState.location === 'india' && good.origin === 'east_africa') ||
             (gameState.location === 'east_africa' && good.origin === 'india')) {
    // 인도 <-> 아라비아 <-> 동아프리카 (편도 4일)
    travelDaysOneWay = 4;
    transportCostOneWay = 45;
  } else if ((gameState.location === 'china' && good.origin === 'arabia') ||
             (gameState.location === 'arabia' && good.origin === 'china')) {
    // 비단길 육상 (편도 4일)
    travelDaysOneWay = 4;
    transportCostOneWay = 45;
  }

  const travelDaysRound = travelDaysOneWay * 2;
  const transportCostRound = transportCostOneWay * 2;
  const livingCostRound = travelDaysRound * GAME_CONFIG.DAILY_LIVING_COST;
  const goodsCost = good.prices[good.origin].buy;
  const totalDirectCost = transportCostRound + livingCostRound + goodsCost;

  document.getElementById('compare-direct-details').innerHTML = `
    <li>현재 위치: <strong>${currentHub.name}</strong> ↔ 목적지: <strong>${originHub.name}</strong></li>
    <li>왕복 이동 소요 시간: <strong>${travelDaysRound}일</strong> (${travelDaysOneWay}일 × 2)</li>
    <li>왕복 운송비: <strong>-${transportCostRound} 냥</strong></li>
    <li>이동 중 고정 생활비(${travelDaysRound}일분): <strong>-${livingCostRound} 냥</strong> (하루 5냥)</li>
    <li>현지 상품 구매 원가: <strong>-${goodsCost} 냥</strong></li>
  `;
  document.getElementById('compare-direct-days').textContent = `총 ${travelDaysRound}일 소요 (많은 시간 필요)`;
  document.getElementById('compare-direct-cost').textContent = `총 ${totalDirectCost} 냥 지출`;

  // 2. 방식 B: 중계무역상 이용
  const middlemanDays = 1;
  const middlemanFee = Math.round(goodsCost * GAME_CONFIG.MIDDLEMAN_COMMISSION_RATE);
  const middlemanLivingCost = 1 * GAME_CONFIG.DAILY_LIVING_COST;
  const totalMiddlemanCost = goodsCost + middlemanFee + middlemanLivingCost;

  document.getElementById('compare-middleman-details').innerHTML = `
    <li>현재 위치: <strong>${currentHub.name}에 체류 (이동 불필요)</strong></li>
    <li>원격 발주 소요 시간: <strong>단 1일!</strong></li>
    <li>현지 상품 구매 원가: <strong>-${goodsCost} 냥</strong></li>
    <li>중계 수수료 (35%): <strong class="red-text">-${middlemanFee} 냥</strong></li>
    <li>체류 1일 생활비: <strong>-${middlemanLivingCost} 냥</strong></li>
  `;
  document.getElementById('compare-middleman-days').textContent = `단 1일 소요! (시간 대폭 절약)`;
  document.getElementById('compare-middleman-cost').textContent = `총 ${totalMiddlemanCost} 냥 지출`;
}

// ==========================================================================
// [최종 결과 보고서 & 학습지 텍스트 복사]
// ==========================================================================
function showFinalResultsModal() {
  const netProfit = gameState.stats.totalRevenue - gameState.stats.totalExpenses;

  document.getElementById('final-funds').textContent = `${gameState.funds.toLocaleString()} 냥`;
  document.getElementById('final-net-profit').textContent = `${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} 냥`;
  document.getElementById('final-net-profit').className = `fin-val ${netProfit >= 0 ? 'green-text' : 'red-text'}`;
  document.getElementById('final-revenue').textContent = `+${gameState.stats.totalRevenue.toLocaleString()} 냥`;
  document.getElementById('final-expenses').textContent = `-${gameState.stats.totalExpenses.toLocaleString()} 냥`;

  document.getElementById('final-exp-goods').textContent = `${gameState.stats.expenseGoods.toLocaleString()} 냥`;
  document.getElementById('final-exp-transport').textContent = `${gameState.stats.expenseTransport.toLocaleString()} 냥`;
  document.getElementById('final-exp-living').textContent = `${gameState.stats.expenseLiving.toLocaleString()} 냥`;
  document.getElementById('final-exp-commission').textContent = `${gameState.stats.expenseCommission.toLocaleString()} 냥`;

  document.getElementById('final-visited-count').textContent = `${gameState.stats.visitedHubs.size}곳`;
  document.getElementById('final-sea-trips').textContent = `${gameState.stats.seaTrips}회`;
  document.getElementById('final-land-trips').textContent = `${gameState.stats.landTrips}회`;
  document.getElementById('final-middleman-orders').textContent = `${gameState.stats.middlemanOrders}회`;

  const visitedNames = Array.from(gameState.stats.visitedHubs).map(h => GAME_CONFIG.HUBS[h].name).join(' → ');
  document.getElementById('final-visited-hubs').textContent = `방문 교역 거점: ${visitedNames}`;

  // 교육적 칭호 부여
  determineMerchantTitle(netProfit);

  openModal('modal-final-result');
}

/** 학생의 활동 패턴에 맞춘 교육적 칭호 산정 */
function determineMerchantTitle(netProfit) {
  const badgeIcon = document.getElementById('merchant-badge-icon');
  const titleText = document.getElementById('merchant-title-text');
  const titleDesc = document.getElementById('merchant-title-desc');

  const { seaTrips, landTrips, middlemanOrders, visitedHubs } = gameState.stats;

  if (middlemanOrders >= 3 && (seaTrips + landTrips) <= 2) {
    badgeIcon.textContent = '🤝';
    titleText.textContent = '실속파 중계무역 네트워크의 거상';
    titleDesc.textContent = '험난한 장거리 이동 대신 중간 상인망을 기민하게 활용하여 시간과 체류 비용을 절약하는 무역의 원리를 꿰뚫어 보았습니다.';
  } else if (visitedHubs.size >= 4 || seaTrips >= 3) {
    badgeIcon.textContent = '⛵';
    titleText.textContent = '인도양의 대항해 개척자';
    titleDesc.textContent = '몬순 계절풍을 타고 아라비아와 동남아시아의 바닷길을 누비며 다양한 세계적 상품의 유통을 직접 경험한 용감한 상인입니다.';
  } else if (landTrips >= 1) {
    badgeIcon.textContent = '🐪';
    titleText.textContent = '실크로드 비단길의 탐험 상인';
    titleDesc.textContent = '중앙아시아의 험준한 사막과 오아시스를 관통하는 육상 경로를 체험하며 육상 무역의 무게를 깊이 이해했습니다.';
  } else if (netProfit > 150) {
    badgeIcon.textContent = '💎';
    titleText.textContent = '탁월한 안목의 글로벌 무역상';
    titleDesc.textContent = '지역별 특산물의 시세 차이를 정확히 파악하여 물류비와 운영비를 감당하고도 훌륭한 흑자를 달성했습니다.';
  } else {
    badgeIcon.textContent = '📜';
    titleText.textContent = '신중한 시장 탐구 상인';
    titleDesc.textContent = '지역 내 교역부터 단계적으로 교역 방식을 확장하며 인도양 무역망의 기초 원리를 성실하게 체험했습니다.';
  }
}

/** 학습지 및 NotebookLM용 텍스트 복사 */
function copyWorksheetSummary() {
  const netProfit = gameState.stats.totalRevenue - gameState.stats.totalExpenses;
  const visitedNames = Array.from(gameState.stats.visitedHubs).map(h => GAME_CONFIG.HUBS[h].name).join(', ');
  const titleText = document.getElementById('merchant-title-text').textContent;

  const summaryText = `[세계적 상품 교역 - 인도양 무역 시뮬레이션 활동 결과 보고서]
- 상인 칭호: ${titleText}
- 최종 보유 자금: ${gameState.funds} 냥 (시작: 500 냥)
- 최종 순이익: ${netProfit >= 0 ? '+' : ''}${netProfit} 냥 (총수익: ${gameState.stats.totalRevenue} 냥 / 총지출: ${gameState.stats.totalExpenses} 냥)

■ 세부 지출 분석:
1. 상품 구매 원가: ${gameState.stats.expenseGoods} 냥
2. 이동 운송비 (해상/육상): ${gameState.stats.expenseTransport} 냥
3. 일일 고정 운영비 (20일분): ${gameState.stats.expenseLiving} 냥
4. 중계무역 수수료 (35%): ${gameState.stats.expenseCommission} 냥

■ 항해 및 교역 통계:
- 방문한 거점 (${gameState.stats.visitedHubs.size}곳): ${visitedNames}
- 해상 이동(⛵): ${gameState.stats.seaTrips}회 / 육상 이동(🐪): ${gameState.stats.landTrips}회
- 중계무역(🤝) 이용: ${gameState.stats.middlemanOrders}회

■ 라운드별 학습지 생각 질문 및 답변 메모:
[1라운드 - 지역 내 교역]
Q. 내가 거래한 상품은 무엇이며, 지역마다 거래할 수 있는 상품에 차이가 있었는가?
답변: 

[2라운드 - 직접 이동 교역]
Q. 직접 다른 지역으로 이동하여 교역하면서 어떤 점을 경험했는가? 이동 과정에서 어떤 비용과 어려움이 발생했는가?
답변: 

[3라운드 - 중계무역]
Q. 중계무역을 이용하면 직접 이동하는 것과 비교해 어떤 점이 편리했는가?
답변: 

[역사 수업 종합 정리]
Q1. 실제 역사 속 상인들은 먼 지역과 교역하는 과정에서 어떤 어려움을 겪었을까?
답변: 
Q2. 직접 이동과 중계무역은 지역 간 상품 교역에 어떤 영향을 주었을까?
답변: 
`;

  const showCopySuccess = () => {
    const alertBox = document.getElementById('copy-success-alert');
    if (alertBox) alertBox.style.display = 'block';
    showToast('info', '📋 학습지용 결과 텍스트가 복사되었습니다!');
    setTimeout(() => {
      if (alertBox) alertBox.style.display = 'none';
    }, 4000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summaryText)
      .then(showCopySuccess)
      .catch(() => fallbackClipboardCopy(summaryText, showCopySuccess));
  } else {
    fallbackClipboardCopy(summaryText, showCopySuccess);
  }
}

/** 구형 브라우저 및 file:// 프로토콜용 클립보드 복사 폴백 */
function fallbackClipboardCopy(text, callback) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful && callback) {
      callback();
    } else {
      showToast('expense', '복사 실패: 화면의 내용을 직접 드래그하여 복사해 주세요.');
    }
  } catch (err) {
    showToast('expense', '복사 실패: 화면의 내용을 직접 드래그하여 복사해 주세요.');
  }
}

// ==========================================================================
// [유틸리티: 토스트 알림, 모달 제어, 활동 로깅]
// ==========================================================================

/** 활동 장부 기록 */
function logActivity(type, text, amount = 0) {
  const currentHub = GAME_CONFIG.HUBS[gameState.location];
  gameState.stats.logs.push({
    day: gameState.currentDay,
    hubName: currentHub.shortName,
    type,
    text,
    amount
  });
}

/** 실시간 플로팅 토스트 메시지 */
function showToast(type, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3200);
}

/** 모달 열기 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

/** 모달 닫기 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

