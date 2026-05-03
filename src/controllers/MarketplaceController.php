<?php

class MarketplaceController extends AppController {

    public function index() {
        $this->requireAuthentication();
        $title = "3 - Marketplace";

        return $this->render("marketplace", ["title" => $title]);
    }

}
