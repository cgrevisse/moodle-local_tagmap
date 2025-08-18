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
 * Callback implementations for TagMap
 *
 * @package    local_tagmap
 * @copyright  2025 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use core_question\local\bank\question_bank_helper;
use core_question\local\bank\question_edit_contexts;

/**
 * Defines the necessary capabilities for this plugin.
 *
 * @return array The necessary capabilities
 */
function local_tagmap_required_capabilities() {
    return ['moodle/question:viewall', 'moodle/course:viewhiddenactivities'];
}

/**
 * Insert a link to the secondary navigation of a course.
 *
 * @param navigation_node $navigation The settings navigation object
 * @param stdClass $course The course
 * @param context $context Course context
 */
function local_tagmap_extend_navigation_course(navigation_node $navigation, stdClass $course, context $context) {
    if (!isloggedin() || isguestuser() || !has_all_capabilities(local_tagmap_required_capabilities(), $context)) {
        return;
    }

    $navigation->add(
        get_string('pluginname', 'local_tagmap'),
        new moodle_url('/local/tagmap/index.php', ['courseid' => $course->id]),
        navigation_node::COURSE_INDEX_PAGE,
    );
}

/**
 * Get all resources of a course.
 *
 * @param stdClass $course The course
 * @return cm_info[] The resources
 */
function local_tagmap_get_course_resources(stdClass $course) {
    $info = get_fast_modinfo($course);
    $resources = $info->instances['resource'] ?? [];
    return array_filter($resources, fn($r): bool => $r->deletioninprogress != "1");
}

/**
 * Get graph data for the course, including resources and questions with their tags.
 *
 * @param stdClass $course The course
 * @param int $contextid The context ID
 * @return array The graph data
 */
function local_tagmap_get_graph_data(stdClass $course, int $contextid) {
    $data = [
        'resources' => [],
        'questions' => [],
    ];

    $resources = local_tagmap_get_course_resources($course);

    foreach ($resources as $resource) {
        $data['resources'][] = [
            'id' => 'R'.$resource->id,
            'name' => $resource->name,
            'url' => (new \moodle_url('/mod/resource/view.php', ['id' => $resource->id]))->__toString(),
            'tags' => \core_tag_tag::get_item_tags_array('core', 'course_modules', $resource->id),
        ];
    }

    // In Moodle 5.0, shared question banks were introduced. Courses can contain multiple question banks.
    global $CFG;
    if ($CFG->version >= 2025041400) {

        $allcaps = array_merge(question_edit_contexts::$caps['editq'], question_edit_contexts::$caps['categories']);
        $sharedbanks = question_bank_helper::get_activity_instances_with_shareable_questions([$course->id], [], $allcaps);
        $privatebanks = question_bank_helper::get_activity_instances_with_private_questions([$course->id], [], $allcaps);

        $qbankcontextids = implode(",", array_merge(
            array_map(fn($sb): int => $sb->contextid, $sharedbanks),
            array_map(fn($sb): int => $sb->contextid, $privatebanks)
        ));
    } else {
        $qbankcontextids = $contextid;
    }

    $categories = qbank_managecategories\helper::get_categories_for_contexts($qbankcontextids);
    $categoryids = array_map(fn($cat): int => $cat->id, $categories);
    $questionids = question_bank::get_finder()->get_questions_from_categories($categoryids, null);

    foreach ($questionids as $qid) {
        $question = \question_bank::load_question($qid);

        $data['questions'][] = [
            'id' => 'Q'.$qid,
            'name' => $question->name,
            'url' => \qbank_previewquestion\helper::question_preview_url($qid)->__toString(),
            'tags' => \core_tag_tag::get_item_tags_array('core_question', 'question', $qid),
        ];
    }

    return $data;
}
