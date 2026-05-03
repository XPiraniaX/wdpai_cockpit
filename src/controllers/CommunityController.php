<?php

class CommunityController extends AppController{

    public function index() {
        $this->requireAuthentication();
        $title = "4 - Community";

        return $this->render("community", ["title" => $title]);
    }

}
