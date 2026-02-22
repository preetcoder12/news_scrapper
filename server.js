const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'extracted_data');

// Middleware
app.use(express.json());

/**
 * Helper to get all cycle directories sorted by date
 */
async function getSortedCycles() {
    if (!await fs.pathExists(DATA_DIR)) return [];
    const dirs = await fs.readdir(DATA_DIR);
    return dirs
        .map(name => {
            const fullPath = path.join(DATA_DIR, name);
            const stats = fs.statSync(fullPath);
            return { name, time: stats.mtime.getTime(), isDirectory: stats.isDirectory() };
        })
        .filter(item => item.isDirectory && item.name !== '.DS_Store' && !item.name.startsWith('.'))
        .sort((a, b) => b.time - a.time);
}

/**
 * GET /cycles
 * Returns a list of all scraping cycles
 */
app.get('/cycles', async (req, res) => {
    try {
        const cycles = await getSortedCycles();
        res.json(cycles.map(c => c.name));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /latest
 * Returns the summary of the most recently COMPLETED cycle
 */
app.get('/latest', async (req, res) => {
    try {
        const cycles = await getSortedCycles();

        // Find the first cycle that actually has a summary.json
        for (const cycle of cycles) {
            const summaryPath = path.join(DATA_DIR, cycle.name, 'summary.json');
            if (await fs.pathExists(summaryPath)) {
                const summary = await fs.readJson(summaryPath);
                return res.json({
                    cycle_id: cycle.name,
                    status: "Completed",
                    ...summary
                });
            }
        }

        res.status(404).json({ error: "No completed cycles found yet." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /niche/:category
 * Aggregates data for a specific niche from ALL news sources.
 * Searches back through cycles until it finds the most recent data.
 */
app.get('/niche/:category', async (req, res) => {
    const { category } = req.params;
    try {
        const cycles = await getSortedCycles();
        if (cycles.length === 0) return res.status(404).json({ error: "No data found" });

        let aggregatedData = [];
        let foundCycle = null;

        for (const cycle of cycles) {
            const cyclePath = path.join(DATA_DIR, cycle.name);
            if (!await fs.pathExists(cyclePath)) continue;

            const sources = await fs.readdir(cyclePath);
            for (const source of sources) {
                const nichePath = path.join(cyclePath, source, category, 'data.json');
                if (await fs.pathExists(nichePath)) {
                    const sourceData = await fs.readJson(nichePath);
                    aggregatedData = aggregatedData.concat(sourceData);
                }
            }

            if (aggregatedData.length > 0) {
                foundCycle = cycle.name;
                break;
            }
        }

        if (aggregatedData.length === 0) {
            return res.status(404).json({ error: `Niche '${category}' not found in any recent data.` });
        }

        res.json({
            niche: category,
            cycle: foundCycle,
            total_items: aggregatedData.length,
            results: aggregatedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /data/:cycle/:source/:category
 */
app.get('/data/:cycle/:source/:category', async (req, res) => {
    const { cycle, source, category } = req.params;
    const dataPath = path.join(DATA_DIR, cycle, source, category, 'data.json');
    try {
        if (await fs.pathExists(dataPath)) {
            const data = await fs.readJson(dataPath);
            res.json(data);
        } else {
            res.status(404).json({ error: "Data not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 NEWS API ONLINE | http://localhost:${PORT}`);
});
