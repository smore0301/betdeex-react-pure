import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Spinner, Card, Row, Col } from 'react-bootstrap';

import Bet from './Bet';
import Sidebar from '../Sidebar/Sidebar';

import { betdeex, categoryArray, subCategoryArray } from '../../env.js';
import provider from '../../ethereum/provider';

const ethers = require('ethers');

class BetsList extends Component {
  state = {
    betsToDisplay: [],
    betsLoading: true
  }

  componentDidMount = () => {
    this.showBets();
  }

  componentDidUpdate = prevProps => {
    if (this.props.categoryId !== prevProps.categoryId || this.props.subCategoryId !== prevProps.subCategoryId) {
      this.showBets();
    }
  }

  showBets = async () => {
    this.setState({ betsToDisplay: [], betsLoading: true });
    const newBetEventSig = ethers.utils.id("NewBetContract(address,address,uint8,uint8,string)");
    console.log('newBetEventSig', newBetEventSig);
    const topics = [
      newBetEventSig, null, null, null
    ];
    topics[2] = this.props.categoryId !== undefined ?
      '0x'+'0'.repeat(64-this.props.categoryId.toString(16).length)+this.props.categoryId.toString(16)
      : null;
    topics[3] = this.props.categoryId !== undefined ?
      '0x'+'0'.repeat(64-this.props.subCategoryId.toString(16).length)+this.props.subCategoryId.toString(16)
      : null;

    const logs = await this.props.store.providerInstance.getLogs({
      address: betdeex.address,
      fromBlock: 0,
      toBlock: 'latest',
      topics
    });

    console.log('fetching logs from the ethereum blockchain', logs);

    let betsArray = [];

    for (let i = logs.length - 1; i >=0; i--) {
      const log = logs[i];
      const address = '0x'+log.data.slice(26,66);
      const description = ethers.utils.toUtf8String('0x'+log.data.slice(192)).replace(/[^A-Za-z 0-9?]/g, "");
      const categoryId = +log.topics[2];
      const subCategoryId = +log.topics[3];
      //const blockNumber = log.blockNumber;

      betsArray.push(address);

      // storing for reusing it in bet page
      // initialising bet object in our mapping
      if(this.props.store.betsMapping[address]===undefined) {
        this.props.dispatch({
          type: 'UPDATE-BETS-MAPPING-ADDBET',
          payload: {
            address
          }
        });
      }

      if(this.props.store.betsMapping[address].description===undefined) {
        this.props.dispatch({
          type: 'UPDATE-BETS-MAPPING-DESCRIPTION',
          payload: {
            address,
            value: description
          }
        });
      }

      if(this.props.store.betsMapping[address].category===undefined) {
        this.props.dispatch({
          type: 'UPDATE-BETS-MAPPING-CATEGORY',
          payload: {
            address,
            value: categoryId
          }
        });
      }

      if(this.props.store.betsMapping[address].subCategory===undefined) {
        this.props.dispatch({
          type: 'UPDATE-BETS-MAPPING-SUBCATEGORY',
          payload: {
            address,
            value: subCategoryId
          }
        });
      }
    }

    // betsArray.forEach(address => {
    //   console.log('soham',this.props.store.betsMapping[address]);
    // });



    this.setState({
      betsToDisplay: betsArray.slice(0,5).map(
        address =>
          <Bet
            key={address}
            address={address}
            description={this.props.store.betsMapping[address].description}
            category={this.props.store.betsMapping[address].category}
            subCategory={this.props.store.betsMapping[address].subCategory}
          />
        ),
      betsLoading: false
     });

    //localStorage.setItem('betdeex-betsArray', betsArray);
    localStorage.setItem('betdeex-betsMapping', JSON.stringify(this.props.store.betsMapping));
  }

  render() {
    return (
      <Row>
        <Col>
          <Sidebar />
        </Col>
        <Col xs="9">
          <Card>Showing 5 bets
          {
            (this.props.categoryId !== undefined
            ? ` of ${categoryArray[this.props.categoryId]}`
            : null)
          }{
            (this.props.subCategoryId !== undefined
            ? `/${subCategoryArray[this.props.categoryId][this.props.subCategoryId]}`
            : null)
          }</Card>
          { this.state.betsLoading ?
            <Spinner animation="border" role="status" style={{marginTop: '15px'}}>
              <span className="sr-only">Loading...</span>
            </Spinner>
            : null
          }
          {this.state.betsToDisplay}
        </Col>
      </Row>
    );
  }
}

export default connect(state => {return{store: state}})(BetsList);
