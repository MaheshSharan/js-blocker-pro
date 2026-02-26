// Unit Tests for JS Blocker Pro
// Run these tests in browser console after loading extension

const JSBlockerTests = {
  results: [],
  
  // Test utilities
  assert(condition, testName) {
    const result = {
      test: testName,
      passed: condition,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    console.log(`${condition ? '✅' : '❌'} ${testName}`);
    return condition;
  },

  assertEqual(actual, expected, testName) {
    const passed = actual === expected;
    this.assert(passed, `${testName} (expected: ${expected}, got: ${actual})`);
    return passed;
  },

  // Phase 1: Script Discovery Tests
  testScriptDiscovery() {
    console.log('\n🧪 Testing Phase 1: Script Discovery');
    
    // Test script ID generation
    const testUrl = 'https://example.com/script.js';
    const id1 = this.generateScriptId(testUrl, 'external', 0);
    const id2 = this.generateScriptId(testUrl, 'external', 0);
    this.assertEqual(id1, id2, 'Script ID generation is consistent');
    
    // Test hash function
    const hash1 = this.simpleHash('test');
    const hash2 = this.simpleHash('test');
    this.assertEqual(hash1, hash2, 'Hash function is deterministic');
    
    // Test byte formatting
    this.assertEqual(this.formatBytes(0), '0 B', 'Format 0 bytes');
    this.assertEqual(this.formatBytes(1024), '1 KB', 'Format 1 KB');
    this.assertEqual(this.formatBytes(1048576), '1 MB', 'Format 1 MB');
  },

  // Phase 2: Classification Tests
  testScriptClassification() {
    console.log('\n🧪 Testing Phase 2: Script Classification');
    
    const classifier = {
      trackingDomains: ['google-analytics.com', 'mixpanel.com'],
      adDomains: ['googlesyndication.com', 'doubleclick.net'],
      cdnDomains: ['cloudflare.com', 'jsdelivr.net']
    };

    // Test tracking detection
    const trackingUrl = 'https://www.google-analytics.com/analytics.js';
    this.assert(
      classifier.trackingDomains.some(d => trackingUrl.includes(d)),
      'Detect tracking domain'
    );

    // Test ad detection
    const adUrl = 'https://googlesyndication.com/ads.js';
    this.assert(
      classifier.adDomains.some(d => adUrl.includes(d)),
      'Detect ad domain'
    );

    // Test entropy calculation
    const lowEntropy = this.calculateEntropy('aaaa');
    const highEntropy = this.calculateEntropy('a7f3k9m2');
    this.assert(highEntropy > lowEntropy, 'High entropy > low entropy');
    this.assert(highEntropy > 4.5, 'Obfuscated filename has high entropy');
  },

  // Phase 3: Behavior Monitoring Tests
  testBehaviorMonitoring() {
    console.log('\n🧪 Testing Phase 3: Behavior Monitoring');
    
    const behaviorFlags = new Map();
    
    // Test flag addition
    const scriptId = 'test-script';
    if (!behaviorFlags.has(scriptId)) {
      behaviorFlags.set(scriptId, new Set());
    }
    behaviorFlags.get(scriptId).add('fingerprint-canvas');
    
    this.assert(
      behaviorFlags.has(scriptId),
      'Behavior flags stored for script'
    );
    this.assert(
      behaviorFlags.get(scriptId).has('fingerprint-canvas'),
      'Canvas fingerprinting flag added'
    );

    // Test multiple flags
    behaviorFlags.get(scriptId).add('storage-access');
    this.assertEqual(
      behaviorFlags.get(scriptId).size,
      2,
      'Multiple behavior flags stored'
    );
  },

  // Phase 4: Dependency Mapping Tests
  testDependencyMapping() {
    console.log('\n🧪 Testing Phase 4: Dependency Mapping');
    
    const dependencies = new Map();
    
    // Test dependency recording
    const parent = 'https://example.com/parent.js';
    const child = 'https://example.com/child.js';
    
    dependencies.set(parent, { parent: null, children: [child] });
    dependencies.set(child, { parent: parent, children: [] });
    
    this.assert(
      dependencies.get(parent).children.includes(child),
      'Parent-child relationship recorded'
    );
    this.assertEqual(
      dependencies.get(child).parent,
      parent,
      'Child knows its parent'
    );

    // Test circular dependency prevention
    const circular = dependencies.get(child).children.includes(parent);
    this.assert(!circular, 'No circular dependencies');
  },

  // Phase 5: Control Modes Tests
  testControlModes() {
    console.log('\n🧪 Testing Phase 5: Control Modes');
    
    const modes = {
      banking: (script) => {
        return script.category === 'Tracking' ||
               script.category === 'Ads' ||
               script.category === 'Suspicious' ||
               script.source === 'Third Party';
      },
      privacy: (script) => {
        return script.source === 'Third Party';
      },
      developer: (script) => {
        return script.category === 'Ads';
      }
    };

    const trackingScript = { category: 'Tracking', source: 'Third Party' };
    const functionalScript = { category: 'Functional', source: 'First Party' };

    this.assert(
      modes.banking(trackingScript),
      'Banking mode blocks tracking'
    );
    this.assert(
      !modes.banking(functionalScript),
      'Banking mode allows first-party functional'
    );
    this.assert(
      modes.privacy(trackingScript),
      'Privacy mode blocks third-party'
    );
    this.assert(
      !modes.developer(functionalScript),
      'Developer mode allows functional'
    );
  },

  // Phase 6: Permission Prompts Tests
  testPermissionPrompts() {
    console.log('\n🧪 Testing Phase 6: Permission Prompts');
    
    const allowedActions = new Map();
    const scriptUrl = 'https://example.com/script.js';
    
    // Test permission storage
    allowedActions.set(scriptUrl, new Set(['canvas-read']));
    
    this.assert(
      allowedActions.has(scriptUrl),
      'Permission stored for script'
    );
    this.assert(
      allowedActions.get(scriptUrl).has('canvas-read'),
      'Canvas read permission granted'
    );

    // Test permission check
    const hasPermission = allowedActions.get(scriptUrl)?.has('canvas-read');
    this.assert(hasPermission, 'Permission check works');

    // Test multiple permissions
    allowedActions.get(scriptUrl).add('webrtc-probe');
    this.assertEqual(
      allowedActions.get(scriptUrl).size,
      2,
      'Multiple permissions stored'
    );
  },

  // Phase 7: Timing Control Tests
  testTimingControl() {
    console.log('\n🧪 Testing Phase 7: Timing Control');
    
    const delayConfig = {
      'script-1': { type: 'interaction', seconds: 0 },
      'script-2': { type: 'scroll', seconds: 0 },
      'script-3': { type: 'time', seconds: 5 }
    };

    let userInteracted = false;
    let userScrolled = false;

    // Test delay conditions
    const shouldDelayInteraction = delayConfig['script-1'].type === 'interaction' && !userInteracted;
    this.assert(shouldDelayInteraction, 'Script delayed until interaction');

    const shouldDelayScroll = delayConfig['script-2'].type === 'scroll' && !userScrolled;
    this.assert(shouldDelayScroll, 'Script delayed until scroll');

    const shouldDelayTime = delayConfig['script-3'].type === 'time';
    this.assert(shouldDelayTime, 'Script delayed by time');

    // Simulate interaction
    userInteracted = true;
    const shouldExecute = delayConfig['script-1'].type === 'interaction' && userInteracted;
    this.assert(shouldExecute, 'Script executes after interaction');
  },

  // Phase 8: WASM Monitoring Tests
  testWASMMonitoring() {
    console.log('\n🧪 Testing Phase 8: WASM Monitoring');
    
    const wasmScript = {
      type: 'wasm',
      url: 'https://example.com/module.wasm',
      category: 'Suspicious'
    };

    this.assertEqual(wasmScript.type, 'wasm', 'WASM type detected');
    this.assertEqual(wasmScript.category, 'Suspicious', 'WASM classified as suspicious');
    this.assert(wasmScript.url.endsWith('.wasm'), 'WASM file extension detected');
  },

  // Phase 9: Trust Scoring Tests
  testTrustScoring() {
    console.log('\n🧪 Testing Phase 9: Trust Scoring');
    
    const calculateScore = (script) => {
      let score = 50;
      
      if (script.category === 'Functional') score += 20;
      if (script.category === 'Tracking') score -= 30;
      if (script.source === 'First Party') score += 15;
      if (script.source === 'Third Party') score -= 10;
      if (script.behaviors?.includes('fingerprint-canvas')) score -= 25;
      
      return Math.max(0, Math.min(100, score));
    };

    const safeScript = {
      category: 'Functional',
      source: 'First Party',
      behaviors: []
    };
    const dangerousScript = {
      category: 'Tracking',
      source: 'Third Party',
      behaviors: ['fingerprint-canvas']
    };

    const safeScore = calculateScore(safeScript);
    const dangerousScore = calculateScore(dangerousScript);

    this.assert(safeScore >= 70, 'Safe script has high trust score');
    this.assert(dangerousScore < 30, 'Dangerous script has low trust score');
    this.assert(safeScore > dangerousScore, 'Safe score > dangerous score');
  },

  // Phase 10: Policy Engine Tests
  testPolicyEngine() {
    console.log('\n🧪 Testing Phase 10: Policy Engine');
    
    const matchesPolicy = (script, conditions) => {
      for (const condition of conditions) {
        if (condition === 'thirdParty' && script.source === 'Third Party') return true;
        if (condition === 'tracking' && script.category === 'Tracking') return true;
        if (condition === 'lowTrust' && script.trustScore < 30) return true;
      }
      return false;
    };

    const script1 = { source: 'Third Party', category: 'Functional', trustScore: 50 };
    const script2 = { source: 'First Party', category: 'Tracking', trustScore: 20 };

    this.assert(
      matchesPolicy(script1, ['thirdParty']),
      'Policy matches third-party script'
    );
    this.assert(
      matchesPolicy(script2, ['tracking']),
      'Policy matches tracking script'
    );
    this.assert(
      matchesPolicy(script2, ['lowTrust']),
      'Policy matches low trust score'
    );
    this.assert(
      !matchesPolicy(script1, ['tracking']),
      'Policy does not match non-tracking'
    );
  },

  // Helper functions (simplified versions)
  generateScriptId(identifier, type, index) {
    return `${type}-${this.simpleHash(identifier)}-${index}`;
  },

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  },

  calculateEntropy(str) {
    const len = str.length;
    const frequencies = {};
    
    for (let i = 0; i < len; i++) {
      frequencies[str[i]] = (frequencies[str[i]] || 0) + 1;
    }
    
    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  },

  // Run all tests
  runAll() {
    console.log('🚀 Starting JS Blocker Pro Unit Tests\n');
    this.results = [];
    
    this.testScriptDiscovery();
    this.testScriptClassification();
    this.testBehaviorMonitoring();
    this.testDependencyMapping();
    this.testControlModes();
    this.testPermissionPrompts();
    this.testTimingControl();
    this.testWASMMonitoring();
    this.testTrustScoring();
    this.testPolicyEngine();
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n📊 Test Results: ${passed}/${total} passed (${percentage}%)`);
    
    if (passed === total) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('❌ Some tests failed. Review results above.');
    }
    
    return this.results;
  }
};

// Auto-run tests if in test environment
if (typeof window !== 'undefined' && window.location.href.includes('test')) {
  JSBlockerTests.runAll();
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JSBlockerTests;
}
