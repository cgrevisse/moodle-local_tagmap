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

namespace local_tagmap\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot.'/local/tagmap/lib.php');

/**
 * Class get_graphdata
 *
 * @package    local_tagmap
 * @copyright  2025 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_graphdata extends external_api {

    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'ID of course'),
        ]);
    }

    /**
     * Returns description of method result value
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'resources' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_TEXT, 'resource ID'),
                    'name' => new external_value(PARAM_TEXT, 'resource name'),
                    'url' => new external_value(PARAM_URL, 'resource URL'),
                    'tags' => new external_multiple_structure(new external_value(PARAM_TEXT, 'tag')),
                ])
            ),
            'questions' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_TEXT, 'question ID'),
                    'name' => new external_value(PARAM_TEXT, 'question name'),
                    'url' => new external_value(PARAM_URL, 'question URL'),
                    'tags' => new external_multiple_structure(new external_value(PARAM_TEXT, 'tag')),
                ])
            ),
        ]);
    }

    /**
     * Tag resource
     * @param object $courseid ID of course
     * @return array of resources and questions
     */
    public static function execute($courseid) {
        $params = self::validate_parameters(self::execute_parameters(), ['courseid' => $courseid]);

        $course = get_course($courseid);

        $context = \context_course::instance($course->id);

        self::validate_context($context);

        require_all_capabilities(local_tagmap_required_capabilities(), $context);

        $graphdata = local_tagmap_get_graph_data($course, $context->id);

        return $graphdata;
    }

}
