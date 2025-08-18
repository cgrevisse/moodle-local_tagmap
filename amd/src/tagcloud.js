// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * AMD module for the TagMap cloud.
 * Based on https://d3-graph-gallery.com/graph/wordcloud_size.html
 *
 * @module     local_tagmap/tagcloud
 * @copyright  2025 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import * as d3 from '../js/d3.v7.min.js';
import cloud from '../js/d3.layout.cloud.js';
import Modal from 'core/modal';
import Templates from 'core/templates';
import {hexToRgb, interpolateColor, sortTags} from './utils';

/**
 * Loads the data for the tag cloud.
 * @async
 * @param {number} courseID The ID of the course for which to load the tag cloud data.
 * @returns {Promise<Object|null>} A promise that resolves to the graph data or null if an error occurs.
 */
async function loadData(courseID) {
    const request = {
        methodname: 'local_tagmap_get_graphdata',
        args: {
            courseid: courseID,
        }
    };

    try {
        const responseObj = await Ajax.call([request])[0];
        if (responseObj.error) {
            window.console.log(responseObj.error.exception.message);
            return null;
        } else {
            return responseObj;
        }
    } catch (error) {
        window.console.log(error.message);
        return null;
    }
}

/**
 * Takes the data from the server and adds further insights.
 *
 * @param {Object} data The data object containing resources and questions.
 */
function transformData(data) {
    let tags = {};

    data.resources.forEach(resource => {
        resource.tags.forEach(tag => {
            if (!tags[tag]) {
                tags[tag] = {resources: [], questions: []};
            }
            tags[tag].resources.push(resource);
        });
    });

    data.questions.forEach(question => {
        question.tags.forEach(tag => {
            if (!tags[tag]) {
                tags[tag] = {resources: [], questions: []};
            }
            tags[tag].questions.push(question);
        });
    });

    data.tags = tags;

    data.maxQuestionsPerTag = Math.max(...Object.values(data.tags).map(v => (v.questions.length)));
    data.maxResourcesPerTag = Math.max(...Object.values(data.tags).map(v => (v.resources.length)));

    data.resources.forEach(resource => {
        resource.tags = resource.tags.map(tag => ({'name': tag, 'used': data.tags[tag].questions.length > 0})).sort(sortTags);
        const usedTags = resource.tags.map(tag => tag.used ? 1 : 0).reduce((a, b) => a + b, 0);
        resource.tagUsage = Math.round(usedTags / resource.tags.length * 100);
    });

    data.questions.forEach(question => {
        question.tags = question.tags.map(tag => ({'name': tag, 'covered': data.tags[tag].resources.length > 0})).sort(sortTags);
        const coveredTags = question.tags.map(tag => tag.covered ? 1 : 0).reduce((a, b) => a + b, 0);
        question.tagCoverage = Math.round(coveredTags / question.tags.length * 100);
    });
}

class TagCloud {
    constructor(courseID, data, container, resourceCentric) {
        this.courseID = courseID;
        this.data = data;
        this.container = container;
        this.resourceCentric = resourceCentric;
        this.initGraph();
    }

    initGraph() {
        const graph = d3.select(this.container);

        // Set the dimensions and margins of the graph
        const margin = {top: 10, right: 10, bottom: 10, left: 10};
        const rect = graph.node().getBoundingClientRect();
        const width = rect.width - margin.left - margin.right;
        const height = rect.height - margin.top - margin.bottom;

        // Append the svg object to the body of the page
        this.svg = graph.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Constructs a new cloud layout instance. It run an algorithm to find the position of words that suits your requirements
        // Wordcloud features that are different from one word to the other must be here
        this.layout = cloud()
            .size([width, height])
            .words(Object.entries(this.data.tags)
                .map(([tag, value]) => ({text: tag, size: this.resourceCentric ? value.resources.length : value.questions.length}))
            )
            .padding(5) // Space between words
            .rotate(0)
            .fontSize(d => d.size * 10) // Font size of words
            .on("end", this.draw.bind(this));
        this.layout.start();
    }

    // This function takes the output of 'layout' above and draw the words
    // Wordcloud features that are THE SAME from one word to the other can be here
    draw(words) {
        this.svg
            .append("g")
            .attr("transform", "translate(" + this.layout.size()[0] / 2 + "," + this.layout.size()[1] / 2 + ")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => d.size)
            .style("fill", this.color.bind(this))
            .attr("text-anchor", "middle")
            .style("font-family", "Arial")
            .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
            .text(d => d.text)
            .on("click", this.handleClick.bind(this))
            .on("mouseover", function() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .style("fill", "orange");
            })
            .on("mouseout", (event) => {
                // Reset color to the original color based on the color function
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .style("fill", d => this.color(d));
            });
    }

    async handleClick(event, d) {
        const tag = d.text;
        await showTagModal(tag, this.data);
    }

    color(d) {
        const tag = d.text;

        if (this.resourceCentric) {
            // The more a tag is covered by resources, the greener it is; the less it is covered, the greyer it is
            const ratio = this.data.tags[tag].questions.length / this.data.maxQuestionsPerTag;
            const lowerColor = hexToRgb("#777777"); // Grey
            const higherColor = hexToRgb("#00ff00"); // Green
            return interpolateColor(ratio, lowerColor, higherColor);
        } else {
            // If the tag is covered by at least one resource, it is green; otherwise, it is red
            return this.data.tags[tag].resources.length > 0 ? "#2ca02c" : "#d62728";
        }
    }
}

/**
 * Shows a modal with the tag details.
 *
 * @param {string} tag The tag.
 * @param {Object} data The data.
 */
async function showTagModal(tag, data) {
    const resources = data.tags[tag].resources;
    const questions = data.tags[tag].questions;

    await Modal.create({
        title: tag,
        body: Templates.render('local_tagmap/tagmodal', {
            tag: tag,
            resources: resources,
            questions: questions,
            numResources: resources.length,
            numQuestions: questions.length
        }),
        show: true,
        removeOnClose: true,
    });
}

/**
 * Show the resource usage.
 *
 * @param {Object} data The data object containing resource usage information.
 */
async function showResourceUsage(data) {
    try {
        const html = await Templates.render('local_tagmap/resourceusage', {resources: data.resources});
        document.getElementById('resourceUsage').innerHTML = html;
        return true;
    } catch (error) {
        document.getElementById('resourceUsage').innerHTML = error.message;
        return false;
    }
}

/**
 * Show the question coverage.
 *
 * @param {Object} data The data object containing question coverage information.
 */
async function showQuestionCoverage(data) {
    try {
        const html = await Templates.render('local_tagmap/questioncoverage', {questions: data.questions});
        document.getElementById('questionCoverage').innerHTML = html;
        return true;
    } catch (error) {
        document.getElementById('questionCoverage').innerHTML = error.message;
        return false;
    }
}

/**
 * Adds click listeners to badge tags.
 *
 * @param {Object} data The data object containing tags and their associated resources and questions.
 */
function addBadgeTagClickListeners(data) {
    // Remove previous listeners to avoid duplicates
    document.querySelectorAll('.badge-tag').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const tag = e.currentTarget.innerHTML;
            showTagModal(tag, data);
        });
    });
}

export const init = async(courseID, resourceTagCloudContainer, questionTagCloudContainer) => {
    const data = await loadData(courseID);
    transformData(data);
    new TagCloud(courseID, data, resourceTagCloudContainer, true);
    new TagCloud(courseID, data, questionTagCloudContainer, false);
    await showResourceUsage(data);
    await showQuestionCoverage(data);
    addBadgeTagClickListeners(data);
};
