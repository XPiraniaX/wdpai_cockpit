<?php

require_once 'AppController.php';

class DashboardController extends AppController {
    public function index() {
        $title = "1 - Dashboard";

        return $this->render("dashboard", ["title" => $title]);
    }
}