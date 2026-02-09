import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { features, featureCategories, Feature } from './features';
import './App.css';

function App() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeatures = useMemo(() => {
    return features.filter(feature => {
      const matchesCategory = !selectedCategory || feature.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.what.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.why.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryColor = (categoryId: string) => {
    return featureCategories.find(c => c.id === categoryId)?.color || '#6366f1';
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="header-content"
        >
          <h1 className="title">
            <span className="gradient-text">Discover Claude</span>
          </h1>
          <p className="subtitle">
            Explore what's possible with AI that understands context, writes code, and thinks alongside you
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="search-container"
        >
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="categories"
        >
          <button
            className={`category-btn ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All Features
          </button>
          {featureCategories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              style={{
                '--category-color': category.color,
              } as React.CSSProperties}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-emoji">{category.emoji}</span>
              {category.name}
            </button>
          ))}
        </motion.div>
      </header>

      {/* Features Constellation */}
      <div className="constellation">
        <div className="features-grid">
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="feature-card"
              onClick={() => setSelectedFeature(feature)}
              style={{
                '--feature-color': getCategoryColor(feature.category),
              } as React.CSSProperties}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-name">{feature.name}</h3>
              <p className="feature-preview">{feature.what}</p>
              <div className="feature-category">
                {featureCategories.find(c => c.id === feature.category)?.emoji}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredFeatures.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="no-results"
          >
            <div className="no-results-icon">🔭</div>
            <p>No features found matching your search</p>
          </motion.div>
        )}
      </div>

      {/* Feature Detail Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-backdrop"
              onClick={() => setSelectedFeature(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="modal"
              style={{
                '--modal-color': getCategoryColor(selectedFeature.category),
              } as React.CSSProperties}
            >
              <button className="modal-close" onClick={() => setSelectedFeature(null)}>
                ✕
              </button>

              <div className="modal-header">
                <div className="modal-icon">{selectedFeature.icon}</div>
                <h2 className="modal-title">{selectedFeature.name}</h2>
                <div className="modal-category">
                  {featureCategories.find(c => c.id === selectedFeature.category)?.name}
                </div>
              </div>

              <div className="modal-content">
                <div className="modal-section">
                  <h3 className="section-title">
                    <span className="section-icon">💡</span>
                    What it does
                  </h3>
                  <p className="section-text">{selectedFeature.what}</p>
                </div>

                <div className="modal-section">
                  <h3 className="section-title">
                    <span className="section-icon">⭐</span>
                    Why it matters
                  </h3>
                  <p className="section-text why-text">{selectedFeature.why}</p>
                </div>

                {selectedFeature.examples && selectedFeature.examples.length > 0 && (
                  <div className="modal-section">
                    <h3 className="section-title">
                      <span className="section-icon">📋</span>
                      Examples
                    </h3>
                    <ul className="examples-list">
                      {selectedFeature.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="try-button" onClick={() => setSelectedFeature(null)}>
                  Got it!
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="footer">
        <p>
          <span className="footer-emoji">✨</span>
          Powered by Claude - Your AI partner for building, learning, and creating
        </p>
      </footer>
    </div>
  );
}

export default App;
