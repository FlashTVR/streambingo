<?php

declare (strict_types = 1);

namespace Bingo\Page;

use Bingo\Config;
use Bingo\Controller\UserController;
use Bingo\Controller\GameController;
use Bingo\Exception\UnauthorizedException;
use Bingo\Model\GameMetaModel;
use Bingo\Model\GameModel;
use Bingo\Model\UserModel;

/**
 * Represents the handler for the game host page.
 */
class HostPage extends Page
{
    /**
     * @inheritDoc
     *
     * @throws \Bingo\Exception\NotFoundException
     * @throws \Bingo\Exception\UnauthorizedException
     */
    protected function run(array $params): void
    {
        $game = $user = null;
        $minimal = false;

        if (\count($params) === 2 && $params[0] === 'source')
        {
            $game = GameController::getGameFromToken($params[1]);
            $user = UserController::getUser($game->getUserId());
            $minimal = true;
        }
        else
        {
            $user = UserController::getCurrentUser();
            if (!$user || !$user->getHost())
            {
                $this->showTemplate('host/beta');

                return;
            }

            $game = GameController::getGame($user->getId(), $user->getName());
        }

        if (\filter_has_var(INPUT_POST, 'action'))
        {
            $this->handleAction($game, $user);
        }
        else
        {
            $this->showPage($game, $user, $minimal);
        }
    }

    /**
     * Shows the game host page.
     *
     * @param \Bingo\Model\GameModel $game The game
     * @param \Bingo\Model\UserModel $user The user
     * @param bool $minimal True to use the minimal source view, false to use the full view
     *
     * @throws \Bingo\Exception\NotFoundException
     */
    protected function showPage(GameModel $game, UserModel $user, bool $minimal): void
    {
        $meta = GameController::getGameMetaData($game);

        $called = $game->getCalled();

        $lastNumber = '-';
        $lastLetter = '-';
        if (!empty($called))
        {
            $lastNumber = $called[\count($called) - 1];
            $lastLetter = GameController::getLetter($lastNumber);
        }

        $data = [
            'scripts'  => [
                'gamehost',
            ],
            'gameName'   => \htmlspecialchars($game->getGameName()),
            'gameToken'  => $user->getGameToken(),
            'gameUrl'    => Config::BASE_URL . Config::BASE_PATH . 'play/' . $game->getGameName(),
            'hostUrl'    => Config::BASE_URL . Config::BASE_PATH . 'host/source/' . $user->getGameToken(),
            'called'     => $called,
            'lastNumber' => $lastNumber,
            'lastLetter' => $lastLetter,
            'autoCall'   => $game->getAutoCall(),
            'cardCount'  => $this->getCardCount($meta),
            'winner'     => $meta->getWinnerName() ?? '--',
        ];

        $this->showTemplate($minimal ? 'host/source' : 'host', $data);
    }

    /**
     * Handles an action request.

     * @param \Bingo\Model\GameModel $game The game
     * @param \Bingo\Model\UserModel $user The user
     *
     * @throws \Bingo\Exception\BadRequestException
     * @throws \Bingo\Exception\NotFoundException
     */
    protected function handleAction(GameModel $game, UserModel $user): void
    {
        $data = [];

        switch (\filter_input(INPUT_POST, 'action'))
        {
            case 'createGame':
                $autoCall = \filter_input(INPUT_POST, 'autoCall', FILTER_VALIDATE_INT);
                GameController::createGame($user->getId(), $user->getName(), $autoCall);
                break;
            case 'callNumber':
                GameController::callNumber($user->getName());
                break;
            case 'getStats':
                $data['cardCount'] = $this->getCardCount(GameController::getGameMetaData($game));
                break;
            case 'updateAutoCall':
                $interval = \filter_input(INPUT_POST, 'interval', FILTER_VALIDATE_INT);
                GameController::setAutoCall($game, $interval);
                break;
        }

        echo \json_encode($data);
    }

    /**
     * Gets the number of cards in the game as a formatted string.
     *
     * @param \Bingo\Model\GameMetaModel $game The metadata for the game
     *
     * @return string The number of cards as a formatted string
     */
    protected function getCardCount(GameMetaModel $game): string
    {
        $count = $game->getNumCards();
        return $count . ($count === 1 ? ' Player' : ' Players');
    }
}
