<?php

require_once 'AppController.php';

class SecurityController extends AppController {

    public function login(){
        $title = "? - Login";
        $this->renderAuth("login", ["title" => $title]);
    }

    public function register() {
        $title = "? - Register";
        $this->renderAuth("register", ["title" => $title]);
    }
}