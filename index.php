<?php
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
 * Index file of the TagMap plugin.
 *
 * @package    local_tagmap
 * @copyright  2025 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../../config.php');
require_once($CFG->dirroot.'/local/tagmap/lib.php');

$courseid = required_param('courseid', PARAM_INT);

$url = new moodle_url('/local/tagmap/index.php', ['courseid' => $courseid]);
$PAGE->set_url($url);

$course = get_course($courseid);

require_login($course);

$course = course_get_format($course)->get_course();

$context = context_course::instance($course->id);
$PAGE->set_context($context);

require_all_capabilities(local_tagmap_required_capabilities(), $context);

$PAGE->set_title(get_string('pluginname', 'local_tagmap'));

$PAGE->set_heading(format_string($course->fullname));

global $PAGE;
$PAGE->requires->css(new moodle_url('/local/tagmap/styles.css'));

echo $OUTPUT->header();

echo $OUTPUT->render_from_template('local_tagmap/tabs', []);

$PAGE->requires->js_call_amd('local_tagmap/tagcloud', 'init', [$courseid, '#resourceTagCloud', '#questionTagCloud']);

echo $OUTPUT->footer();
